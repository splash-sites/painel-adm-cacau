import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Input } from '../ui/Input'
import { useDebouncedValue } from '../ui/useDebouncedValue'
import { cardClass, tableCardClass, tableHeaderCellClass } from '../ui/styles'
import { useProductList } from '../product/useProducts'
import { ResellerStockRow } from './ResellerStockRow'

const PAGE_SIZE = 20

interface ResellerStockPanelProps {
  storeId: string
}

/** Produtos liberados pro revendedor (available_reseller) com o saldo de estoque editável. */
export function ResellerStockPanel({ storeId }: ResellerStockPanelProps) {
  const [page, setPage] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput.trim(), 300)

  useEffect(() => {
    setPage(0)
  }, [search])

  const { data, isLoading, error } = useProductList({
    storeId,
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    menuType: 'reseller',
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <div className="space-y-4">
      <p className="font-body text-sm text-muted">
        Saldo separado do estoque normal, só pros pedidos de revendedor. Ligue "Controlar estoque" nos produtos que
        querem limite: o saldo baixa a cada pedido, bloqueia pedido acima dele e volta se o pedido for cancelado.
        Produto com o controle desligado nunca bloqueia pedido.
      </p>

      <div className="relative w-full md:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Buscar por código ou nome"
          aria-label="Buscar produtos de revendedor por código ou nome"
          className="pl-9"
        />
      </div>

      {isLoading && <p className="font-body">Carregando...</p>}
      {error && <p className="font-body text-danger">Erro ao carregar produtos</p>}

      {data && data.items.length === 0 && (
        <div className={cardClass}>
          <p className="font-body text-muted">
            {search
              ? 'Nenhum produto encontrado com essa busca.'
              : 'Nenhum produto liberado pra revendedor ainda. Marque "Revendedor" no cadastro do produto.'}
          </p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className={`${tableCardClass} overflow-x-auto`}>
          <table className="w-full min-w-[760px] text-left font-body">
            <thead>
              <tr className="h-11">
                <th className={`${tableHeaderCellClass} pl-6`}>Código</th>
                <th className={tableHeaderCellClass}>Produto</th>
                <th className={tableHeaderCellClass}>Categoria</th>
                <th className={tableHeaderCellClass}>Controlar estoque</th>
                <th className={`${tableHeaderCellClass} pr-6`}>Estoque revendedor</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((product) => (
                <ResellerStockRow key={`${product.id}-${product.resellerStockQuantity}`} product={product} />
              ))}
            </tbody>
          </table>

          <div className="flex h-11 items-center justify-end gap-6 border-t border-line px-6 font-body text-sm">
            <span className="text-muted">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.total)} de {data.total}
            </span>
            <div className="flex items-center">
              <button
                type="button"
                aria-label="Página anterior"
                disabled={page === 0}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Próxima página"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
