import type { Category } from '../category/Category'
import type { Product } from './Product'

export interface CategoryGroup {
  /** `null` = grupo dos produtos sem categoria (sempre por último). */
  category: Category | null
  products: Product[]
}

/**
 * Ordena produtos pela ordem de exibição no cardápio: `sortOrder` ascendente,
 * nome como desempate. Mesma regra que o storefront usa dentro de cada categoria
 * (lendo `products.sort_order` via `public_products`).
 */
export function byProductOrder(a: Product, b: Product): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
  return a.name.localeCompare(b.name)
}

/**
 * Agrupa os produtos por categoria, na ordem das categorias (por `sortOrder`, nome
 * como desempate). Dentro de cada grupo os produtos vêm por `byProductOrder`.
 * O grupo `category: null` (produtos sem categoria) vai no fim e só aparece se tiver produto.
 * Categoria sem nenhum produto ainda aparece (grupo vazio) — a tela precisa mostrar todas.
 */
export function groupByCategory(products: Product[], categories: Category[]): CategoryGroup[] {
  const orderedCategories = [...categories].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
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
    products: (byCategoryId.get(category.id) ?? []).sort(byProductOrder),
  }))

  if (uncategorized.length > 0) {
    groups.push({ category: null, products: uncategorized.sort(byProductOrder) })
  }

  return groups
}
