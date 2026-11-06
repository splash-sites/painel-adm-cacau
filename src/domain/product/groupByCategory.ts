import type { Category } from '../category/Category'
import type { Product } from './Product'

export interface CategoryGroup {
  /** `null` = grupo dos produtos sem categoria (sempre por último). */
  category: Category | null
  products: Product[]
}

/** As 3 formas de vender, cada uma com sua própria ordem de categoria e de produto. */
export type MenuChannel = 'dine_in' | 'pickup' | 'reseller'

interface Orderable {
  sortOrder: number
  sortOrderPickup: number
  sortOrderReseller: number
}

function sortOrderFor(entity: Orderable, channel: MenuChannel): number {
  if (channel === 'pickup') return entity.sortOrderPickup
  if (channel === 'reseller') return entity.sortOrderReseller
  return entity.sortOrder
}

/**
 * Ordena produtos pela ordem de exibição no cardápio do canal: `sortOrder*` ascendente,
 * nome como desempate. Mesma regra que o storefront usa dentro de cada categoria
 * (lendo `products.sort_order*` via `public_products`).
 */
export function byProductOrder(channel: MenuChannel): (a: Product, b: Product) => number {
  return (a, b) => {
    const diff = sortOrderFor(a, channel) - sortOrderFor(b, channel)
    if (diff !== 0) return diff
    return a.name.localeCompare(b.name)
  }
}

/**
 * Agrupa os produtos por categoria, na ordem das categorias do canal (por `sortOrder*`, nome
 * como desempate). Dentro de cada grupo os produtos vêm pela mesma ordem do canal.
 * O grupo `category: null` (produtos sem categoria) vai no fim e só aparece se tiver produto.
 * Categoria sem nenhum produto ainda aparece (grupo vazio) — a tela de organizar precisa mostrar
 * todas, mesmo as que ainda não têm produto nesse canal (ver isProductEligibleForChannel pra
 * decidir se, aqui, "produto" significa "produto disponível nesse canal").
 */
export function groupByCategory(products: Product[], categories: Category[], channel: MenuChannel = 'dine_in'): CategoryGroup[] {
  const compareProducts = byProductOrder(channel)
  const orderedCategories = [...categories].sort((a, b) => {
    const diff = sortOrderFor(a, channel) - sortOrderFor(b, channel)
    if (diff !== 0) return diff
    return a.name.localeCompare(b.name)
  })

  const byCategoryId = new Map<string, Product[]>()
  const uncategorized: Product[] = []
  for (const product of products) {
    if (product.categoryId == null) {
      uncategorized.push(product)
      continue
    }
    const bucket = byCategoryId.get(product.categoryId)
    if (bucket) bucket.push(product)
    else byCategoryId.set(product.categoryId, [product])
  }

  const groups: CategoryGroup[] = orderedCategories.map((category) => ({
    category,
    products: (byCategoryId.get(category.id) ?? []).sort(compareProducts),
  }))

  if (uncategorized.length > 0) {
    groups.push({ category: null, products: uncategorized.sort(compareProducts) })
  }

  return groups
}
