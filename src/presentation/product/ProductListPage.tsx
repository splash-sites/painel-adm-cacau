import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Pencil, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import { useStore } from '../store/useStores'
import { useCategoryList } from '../category/useCategories'
import { useDeleteProduct, useExportProducts, useProductList } from './useProducts'
import { isProductIncomplete } from '../../domain/product/isProductIncomplete'
import type { Product } from '../../domain/product/Product'
import type { ProductMenuType } from '../../application/product/ProductRepository'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { ConfirmModal } from '../ui/ConfirmModal'
import { Input } from '../ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select'
import { useDebouncedValue } from '../ui/useDebouncedValue'
import { cardClass, tableCardClass, tableHeaderCellClass, tableRowClass } from '../ui/styles'
import { ProductModal } from './ProductModal'

const MENU_TYPE_OPTIONS: { value: ProductMenuType; label: string }[] = [
  { value: 'dine_in', label: 'Cafeteria' },
  { value: 'pickup', label: 'Para levar/entrega' },
  { value: 'reseller', label: 'Revendedor' },
]

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

function menuTypeLabel(product: Product): string {
  return (
    [
      product.availableDineIn && 'Cafeteria',
      product.availablePickup && 'Para levar/entrega',
      product.availableReseller && 'Revendedor',
    ]
      .filter(Boolean)
      .join(', ') || '—'
  )
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ProductListPage() {
  const storeId = useEffectiveStoreId()
  const navigate = useNavigate()
  const importInputRef = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<number>(10)
  const [incompleteOnly, setIncompleteOnly] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [menuTypeFilter, setMenuTypeFilter] = useState<'all' | ProductMenuType>('all')
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const search = useDebouncedValue(searchInput.trim(), 300)
  const categoryId = categoryFilter === 'all' ? undefined : categoryFilter
  const menuType = menuTypeFilter === 'all' ? undefined : menuTypeFilter
  const hasFilters = Boolean(search) || Boolean(categoryId) || Boolean(menuType) || incompleteOnly

  // Qualquer filtro que muda o conjunto de resultados volta pra página 1.
  useEffect(() => {
    setPage(0)
  }, [search, categoryId, menuType, incompleteOnly])

  function handleImportFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    navigate('/produtos/importar', { state: { file } })
  }

  const { data, isLoading, error } = useProductList({
    storeId,
    page,
    pageSize,
    incompleteOnly,
    search: search || undefined,
    categoryId,
    menuType,
  })
  const { data: store } = useStore(storeId)
  const { data: categories } = useCategoryList(storeId ?? '')
  const deleteProduct = useDeleteProduct()
  const exportProducts = useExportProducts()

  async function handleExport() {
    if (!storeId) return
    const today = new Date().toISOString().slice(0, 10)
    try {
      const count = await exportProducts.mutateAsync({
        storeId,
        storeName: store?.name ?? 'Loja',
        fileBase: `produtos-${store?.slug ?? 'loja'}-${today}`,
      })
      toast.success(
        count > 0
          ? `Planilha exportada — ${count} produto${count === 1 ? '' : 's'}.`
          : 'Planilha exportada — modelo vazio (nenhum produto cadastrado).',
      )
    } catch (exportError) {
      toast.error(exportError instanceof Error ? exportError.message : 'Falha ao exportar planilha')
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1

  function handlePageSizeChange(value: string) {
    setPageSize(Number(value))
    setPage(0)
  }

  async function handleDelete() {
    if (!deletingProduct) return
    try {
      await deleteProduct.mutateAsync(deletingProduct.id)
      toast.success('Produto excluído.')
      setDeletingProduct(null)
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Falha ao excluir produto')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl md:text-3xl text-accent">Produtos</h2>
        {storeId && (
          <div className="flex gap-3">
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.csv"
              onChange={handleImportFileSelected}
              className="hidden"
            />
            <Button variant="outline" onClick={() => importInputRef.current?.click()}>
              Importar planilha
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={exportProducts.isPending}>
              {exportProducts.isPending ? 'Exportando...' : 'Exportar planilha'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/produtos/adicionais')}>
              Adicionais
            </Button>
            <Button variant="outline" onClick={() => navigate('/produtos/variacoes')}>
              Variações
            </Button>
            <Button variant="outline" onClick={() => navigate('/produtos/categorias')}>
              Categorias
            </Button>
            <Button onClick={() => setIsCreating(true)}>Novo produto</Button>
          </div>
        )}
      </div>

      {!storeId && <p className="font-body">Selecione uma loja pra ver os produtos.</p>}
      {isLoading && <p className="font-body">Carregando...</p>}
      {error && <p className="font-body text-red-600">Erro ao carregar produtos</p>}

      {storeId && (
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
            <Input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar por código ou nome"
              aria-label="Buscar produtos por código ou nome"
              className="pl-9"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-52">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {(categories ?? []).map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={menuTypeFilter}
            onValueChange={(value) => setMenuTypeFilter(value as 'all' | ProductMenuType)}
          >
            <SelectTrigger className="w-full md:w-52">
              <SelectValue placeholder="Tipo cardápio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {MENU_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="flex items-center gap-2 font-body text-sm">
            <Checkbox
              checked={incompleteOnly}
              onCheckedChange={(checked) => setIncompleteOnly(checked === true)}
            />
            Só incompletos
          </label>
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className={cardClass}>
          <p className="font-body text-foreground/70">
            {hasFilters
              ? 'Nenhum produto encontrado com esses filtros.'
              : 'Nenhum produto cadastrado ainda.'}
          </p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className={`${tableCardClass} overflow-x-auto`}>
          <table className="w-full min-w-[900px] table-fixed text-left font-body">
            <colgroup>
              <col className="w-[100px]" />
              <col className="w-[200px]" />
              <col className="w-[120px]" />
              <col className="w-[100px]" />
              <col className="w-[110px]" />
              <col className="w-[280px]" />
              <col className="w-[90px]" />
            </colgroup>
            <thead>
              <tr className="h-11">
                <th className={`${tableHeaderCellClass} pl-6`}>Código</th>
                <th className={tableHeaderCellClass}>Descrição</th>
                <th className={tableHeaderCellClass}>Valor não lover</th>
                <th className={tableHeaderCellClass}>Valor lover</th>
                <th className={tableHeaderCellClass}>Categoria</th>
                <th className={tableHeaderCellClass}>Tipo cardápio</th>
                <th className={`${tableHeaderCellClass} pr-6`}></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((product) => (
                <tr key={product.id} className={tableRowClass}>
                  <td className="py-3 pl-6 truncate">{product.externalCode}</td>
                  <td className="py-3 truncate">
                    <span className="flex items-center gap-2">
                      <span className="truncate">{product.name}</span>
                      {isProductIncomplete(product) && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          Incompleto
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 truncate">{formatCurrency(product.price)}</td>
                  <td className="py-3 truncate">{formatCurrency(product.loverPrice)}</td>
                  <td className="py-3 truncate">{product.categoryName ?? '—'}</td>
                  <td className="py-3 truncate text-sm">{menuTypeLabel(product)}</td>
                  <td className="py-3 pr-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Editar ${product.name}`}
                        onClick={() => setEditingProduct(product)}
                        className="rounded-md p-1.5 text-foreground/50 hover:bg-secondary/10 hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Excluir ${product.name}`}
                        onClick={() => setDeletingProduct(product)}
                        className="rounded-md p-1.5 text-foreground/50 hover:bg-red-700/10 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex h-11 items-center justify-end gap-6 border-t border-secondary/15 px-6 font-body text-sm">
            <div className="flex items-center gap-2">
              <span className="text-foreground/60">Linhas por página:</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-auto gap-1.5 border-none py-1 text-sm hover:bg-secondary/10">
                  <SelectValue>{pageSize}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <span className="text-foreground/60">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.total)} de {data.total}
            </span>

            <div className="flex items-center">
              <button
                type="button"
                aria-label="Página anterior"
                disabled={page === 0}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-md p-1.5 text-foreground/50 hover:bg-secondary/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Próxima página"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-md p-1.5 text-foreground/50 hover:bg-secondary/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingProduct && (
        <ConfirmModal
          title="Excluir produto"
          description={`Excluir "${deletingProduct.name}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Confirmar exclusão"
          pendingLabel="Excluindo..."
          confirmVariant="danger"
          isPending={deleteProduct.isPending}
          onClose={() => setDeletingProduct(null)}
          onConfirm={handleDelete}
        />
      )}

      {editingProduct && (
        <ProductModal
          key={editingProduct.id}
          storeId={editingProduct.storeId}
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {isCreating && storeId && (
        <ProductModal storeId={storeId} onClose={() => setIsCreating(false)} />
      )}
    </div>
  )
}
