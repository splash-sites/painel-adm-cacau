import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import { useOrderList } from './useOrders'
import { useFinalizedClear } from './useFinalizedClear'
import { KANBAN_COLUMNS } from '../../domain/order/orderStatusRules'
import { NotificationPermissionBanner } from './NotificationPermissionBanner'
import { OrderCard } from './OrderCard'

const COLUMN_COLOR: Record<string, string> = {
  received: 'bg-amber-500',
  preparing: 'bg-amber-500',
  out_for_delivery: 'bg-blue-500',
  ready_for_pickup: 'bg-blue-500',
  finalized: 'bg-green-500',
}

export function OrderDashboardPage() {
  const storeId = useEffectiveStoreId()
  const clearedAtByStore = useFinalizedClear((state) => state.clearedAtByStore)
  const clearFinalized = useFinalizedClear((state) => state.clearFinalized)

  const { data: orders, isLoading, error } = useOrderList({ storeId })

  const clearedAt = clearedAtByStore[storeId]

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl md:text-3xl text-accent">Dashboard de pedidos</h2>

      {storeId && <NotificationPermissionBanner storeId={storeId} />}

      {!storeId && <p className="font-body">Selecione uma loja pra ver os pedidos.</p>}
      {isLoading && <p className="font-body">Carregando...</p>}
      {error && <p className="font-body text-red-600">Erro ao carregar pedidos</p>}

      {orders && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {KANBAN_COLUMNS.map((column) => {
            let columnOrders = orders.filter((order) => column.matches(order))
            if (column.key === 'finalized' && clearedAt) {
              columnOrders = columnOrders.filter(
                (order) => new Date(order.updatedAt).getTime() > new Date(clearedAt).getTime(),
              )
            }
            // Finalizado é histórico — mais útil ver o que acabou de fechar primeiro.
            // As outras colunas mostram o mais antigo primeiro (prioriza quem já esperou mais).
            const sortedOrders =
              column.key === 'finalized'
                ? [...columnOrders].sort(
                    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
                  )
                : columnOrders
            return (
              <div key={column.key} data-testid={`kanban-column-${column.key}`} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className={`h-2 w-2 rounded-full ${COLUMN_COLOR[column.key]}`} />
                  <h3 className="font-body font-medium text-sm">{column.label}</h3>
                  <span className="text-xs text-foreground/50">({columnOrders.length})</span>
                  {column.key === 'finalized' && columnOrders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearFinalized(storeId)}
                      className="ml-auto text-xs text-foreground/50 hover:text-foreground"
                    >
                      Zerar
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {columnOrders.length === 0 && (
                    <p className="text-sm font-body text-foreground/40 px-1">Nenhum pedido</p>
                  )}
                  {sortedOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
