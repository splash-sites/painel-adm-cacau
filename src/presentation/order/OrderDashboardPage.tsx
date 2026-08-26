import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import { useOrderList } from './useOrders'
import { useFinalizedClear } from './useFinalizedClear'
import { dashboardFinalizedCutoff } from '../../domain/order/orderPeriod'
import { KANBAN_COLUMNS } from '../../domain/order/orderStatusRules'
import { groupDeliveredOrdersByTable, groupOrdersByTableSession } from '../../domain/order/tableSessionRules'
import { NotificationPermissionBanner } from './NotificationPermissionBanner'
import { OrderCard } from './OrderCard'
import { RealtimeConnectionBanner } from './RealtimeConnectionBanner'
import { TableGroupCard } from './TableGroupCard'
import { TableSessionSummaryBar } from './TableSessionSummaryBar'
import { useOpenTableSessionIds } from './useTableSessions'

const COLUMN_COLOR: Record<string, string> = {
  received: 'bg-amber-500',
  preparing: 'bg-amber-500',
  out_for_delivery: 'bg-blue-500',
  ready_for_pickup: 'bg-blue-500',
  delivered: 'bg-blue-500',
  finalized: 'bg-green-500',
}

export function OrderDashboardPage() {
  const storeId = useEffectiveStoreId()
  const clearedAtByStore = useFinalizedClear((state) => state.clearedAtByStore)
  const clearFinalized = useFinalizedClear((state) => state.clearFinalized)

  const { data: orders, isLoading, error } = useOrderList({ storeId })
  const { data: openTableSessionIds } = useOpenTableSessionIds(storeId)

  const clearedAt = clearedAtByStore[storeId] ?? null

  const tableSessionSummaries =
    orders && openTableSessionIds
      ? groupOrdersByTableSession(orders).filter((summary) =>
          openTableSessionIds.includes(summary.tableSessionId),
        )
      : []

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl md:text-3xl text-accent">Dashboard de pedidos</h2>

      {storeId && <NotificationPermissionBanner storeId={storeId} />}
      <RealtimeConnectionBanner />
      <TableSessionSummaryBar summaries={tableSessionSummaries} />

      {!storeId && <p className="font-body">Selecione uma loja pra ver os pedidos.</p>}
      {isLoading && <p className="font-body">Carregando...</p>}
      {error && <p className="font-body text-red-600">Erro ao carregar pedidos</p>}

      {orders && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {KANBAN_COLUMNS.map((column) => {
            let columnOrders = orders.filter((order) => column.matches(order))
            if (column.key === 'finalized') {
              const cutoff = dashboardFinalizedCutoff(clearedAt)
              columnOrders = columnOrders.filter(
                (order) => new Date(order.updatedAt).getTime() > new Date(cutoff).getTime(),
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

            // "Entregue" mescla pedidos (2+) da mesma mesa num card só, pra facilitar a atendente
            // cobrar a mesa inteira — outras colunas continuam pedido por pedido (cozinha trabalha assim).
            const { groups: tableGroups, ungrouped: ungroupedOrders } =
              column.key === 'delivered'
                ? groupDeliveredOrdersByTable(sortedOrders)
                : { groups: [], ungrouped: sortedOrders }

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
                  {ungroupedOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                  {tableGroups.map((group) => (
                    <TableGroupCard key={group.tableSessionId} orders={group.orders} />
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
