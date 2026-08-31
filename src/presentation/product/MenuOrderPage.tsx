import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import { groupByCategory, type CategoryGroup } from '../../domain/product/groupByCategory'
import { isProductIncomplete } from '../../domain/product/isProductIncomplete'
import type { Product } from '../../domain/product/Product'
import { useCategoryList, useReorderCategories } from '../category/useCategories'
import { useAllProducts, useReorderProductsInCategory } from './useProducts'
import { Button } from '../ui/Button'
import { SortableItem, SortableList } from '../ui/SortableList'
import { cardClass, tableCardClass } from '../ui/styles'

const UNCATEGORIZED_KEY = '__uncategorized__'

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function groupKey(group: CategoryGroup): string {
  return group.category?.id ?? UNCATEGORIZED_KEY
}

export function MenuOrderPage() {
  const storeId = useEffectiveStoreId()
  const navigate = useNavigate()
  const { data: categories, isLoading: loadingCategories } = useCategoryList(storeId ?? '')
  const { data: products, isLoading: loadingProducts, error } = useAllProducts(storeId ?? '')
  const reorderCategories = useReorderCategories()
  const reorderProducts = useReorderProductsInCategory(storeId ?? '')

  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const groups = useMemo(
    () => (categories && products ? groupByCategory(products, categories) : []),
    [categories, products],
  )
  const draggableCategoryIds = groups
    .filter((group) => group.category !== null)
    .map((group) => group.category!.id)

  function toggle(key: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleCategoryReorder(nextIds: string[]) {
    if (!storeId) return
    reorderCategories.mutate(
      { storeId, orderedIds: nextIds },
      {
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : 'Falha ao reordenar categorias'),
      },
    )
  }

  function handleProductReorder(categoryId: string | null, nextIds: string[]) {
    reorderProducts.mutate(
      { categoryId, orderedIds: nextIds },
      {
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : 'Falha ao reordenar produtos'),
      },
    )
  }

  const isLoading = loadingCategories || loadingProducts

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl md:text-3xl text-accent">Organizar cardápio</h2>
          <p className="font-body text-sm text-foreground/60">
            Arraste as categorias e os produtos pra montar a ordem que aparece no cardápio. Salva na hora.
          </p>
        </div>
        {storeId && (
          <Button variant="outline" onClick={() => navigate('/produtos')}>
            <ArrowLeft className="h-4 w-4" />
            Produtos
          </Button>
        )}
      </div>

      {!storeId && <p className="font-body">Selecione uma loja pra organizar o cardápio.</p>}
      {isLoading && storeId && <p className="font-body">Carregando...</p>}
      {error && <p className="font-body text-red-600">Erro ao carregar o cardápio</p>}

      {storeId && !isLoading && groups.length === 0 && (
        <div className={cardClass}>
          <p className="font-body text-foreground/70">
            Nenhuma categoria cadastrada ainda. Crie categorias e vincule produtos a elas primeiro.
          </p>
        </div>
      )}

      {groups.length > 0 && (
        <div className={`${tableCardClass} space-y-1 p-2`}>
          <SortableList ids={draggableCategoryIds} onReorder={handleCategoryReorder}>
            {groups.map((group) => (
              <CategorySection
                key={groupKey(group)}
                group={group}
                open={expanded.has(groupKey(group))}
                onToggle={() => toggle(groupKey(group))}
                onReorderProducts={(nextIds) => handleProductReorder(group.category?.id ?? null, nextIds)}
              />
            ))}
          </SortableList>
        </div>
      )}
    </div>
  )
}

function ProductRows({
  products,
  onReorder,
}: {
  products: Product[]
  onReorder: (nextIds: string[]) => void
}) {
  if (products.length === 0) {
    return (
      <p className="px-2 py-2 font-body text-sm text-foreground/40">Nenhum produto nessa categoria.</p>
    )
  }

  return (
    <SortableList ids={products.map((product) => product.id)} onReorder={onReorder}>
      <div className="space-y-0.5">
        {products.map((product) => (
          <SortableItem key={product.id} id={product.id}>
            {({ setActivatorNodeRef, attributes, listeners }) => (
              <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-secondary/5">
                <button
                  type="button"
                  ref={setActivatorNodeRef}
                  {...attributes}
                  {...listeners}
                  aria-label={`Arrastar ${product.name}`}
                  className="cursor-grab touch-none rounded-md p-1 text-foreground/40 hover:bg-secondary/10 hover:text-foreground active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="h-9 w-9 shrink-0 rounded-md bg-secondary/10" />
                )}
                <span className="min-w-0 flex-1 truncate font-body text-sm">
                  {product.name}
                  {isProductIncomplete(product) && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      Incompleto
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-body text-sm text-foreground/60">
                  {formatCurrency(product.price)}
                </span>
              </div>
            )}
          </SortableItem>
        ))}
      </div>
    </SortableList>
  )
}

function SectionHeader({
  group,
  open,
  onToggle,
  dragHandle,
}: {
  group: CategoryGroup
  open: boolean
  onToggle: () => void
  dragHandle: ReactNode
}) {
  const isUncategorized = group.category === null
  const nameClass = isUncategorized
    ? 'font-medium text-foreground/60'
    : group.category!.active
      ? 'font-medium'
      : 'font-medium text-foreground/40 line-through'

  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-secondary/5">
      {dragHandle}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex flex-1 items-center gap-2 font-body"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-foreground/40" />
        ) : (
          <ChevronRight className="h-4 w-4 text-foreground/40" />
        )}
        <span className={nameClass}>{group.category?.name ?? 'Sem categoria'}</span>
        <span className="text-xs text-foreground/50">
          {group.products.length} produto{group.products.length === 1 ? '' : 's'}
        </span>
      </button>
    </div>
  )
}

function CategorySection({
  group,
  open,
  onToggle,
  onReorderProducts,
}: {
  group: CategoryGroup
  open: boolean
  onToggle: () => void
  onReorderProducts: (nextIds: string[]) => void
}) {
  const body = open && (
    <div className="pb-1 pl-8 pr-2">
      <ProductRows products={group.products} onReorder={onReorderProducts} />
    </div>
  )

  // "Sem categoria" não é uma categoria de verdade — fica fixa no fim, sem alça de arrastar.
  if (group.category === null) {
    return (
      <div>
        <SectionHeader
          group={group}
          open={open}
          onToggle={onToggle}
          dragHandle={<span className="w-6 shrink-0" />}
        />
        {body}
      </div>
    )
  }

  return (
    <SortableItem id={group.category.id}>
      {({ setActivatorNodeRef, attributes, listeners }) => (
        <div>
          <SectionHeader
            group={group}
            open={open}
            onToggle={onToggle}
            dragHandle={
              <button
                type="button"
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                aria-label={`Arrastar categoria ${group.category!.name}`}
                className="cursor-grab touch-none rounded-md p-1 text-foreground/40 hover:bg-secondary/10 hover:text-foreground active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4" />
              </button>
            }
          />
          {body}
        </div>
      )}
    </SortableItem>
  )
}
