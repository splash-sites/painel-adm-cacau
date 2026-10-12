import type { Order } from '../../domain/order/Order'
import { calculateOrderTotal } from '../../domain/order/orderPricing'
import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import { useOrderList } from './useOrders'
import { useFinalizedClear } from './useFinalizedClear'
import { dashboardFinalizedCutoff } from '../../domain/order/orderPeriod'
import { KANBAN_COLUMNS } from '../../domain/order/orderStatusRules'
import { groupDeliveredOrdersByTable, groupOrdersByTableSession } from '../../domain/order/tableSessionRules'
import { NotificationPermissionBanner } from './NotificationPermissionBanner'
import { OrderCard } from './OrderCard'
import { formatCurrency } from './orderCardFormat'
import { RealtimeConnectionBanner } from './RealtimeConnectionBanner'
import { TableGroupCard } from './TableGroupCard'
import { TableSessionSummaryBar } from './TableSessionSummaryBar'
import { useOpenTableSessionIds } from './useTableSessions'

/** Colunas na tela: "Saiu pra entrega" e "Pronto para retirada" dividem a coluna "Prontos". */
const SCREEN_COLUMNS: { label: string; keys: string[] }[] = [
  { label: 'Novos', keys: ['received'] },
  { label: 'Em preparo', keys: ['preparing'] },
  { label: 'Prontos', keys: ['ready_for_pickup', 'out_for_delivery'] },
  { label: 'Entregues', keys: ['delivered'] },
  { label: 'Finalizados', keys: ['finalized'] },
]

const todayLabel = () =>
  new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (c) => c.toUpperCase())

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

  const activeOrders = orders?.filter((order) => order.status !== 'cancelled') ?? []
  const finalizedTotal = activeOrders
    .filter((order) => order.status === 'finalized')
    .reduce((sum, order) => sum + calculateOrderTotal(order), 0)

  function columnOrdersFor(key: string): Order[] {
    if (!orders) return []
    const column = KANBAN_COLUMNS.find((candidate) => candidate.key === key)!
    let columnOrders = orders.filter((order) => column.matches(order))
    if (key === 'finalized') {
      const cutoff = dashboardFinalizedCutoff(clearedAt)
      columnOrders = columnOrders
        .filter((order) => new Date(order.updatedAt).getTime() > new Date(cutoff).getTime())
        // Finalizado é histórico: o que acabou de fechar vem primeiro. Nas outras colunas,
        // o mais antigo primeiro (prioriza quem já esperou mais).
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    }
    return columnOrders
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink">Pedidos de hoje</h2>
          <span className="text-sm text-muted">{todayLabel()}</span>
        </div>
        {orders && (
          <dl className="flex gap-7 tabular-nums">
            <div className="flex flex-col">
              <dt className="text-[13px] text-muted">Pedidos</dt>
              <dd className="text-[22px] font-semibold">{activeOrders.length}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-[13px] text-muted">Finalizado</dt>
              <dd className="text-[22px] font-semibold">{formatCurrency(finalizedTotal)}</dd>
            </div>
          </dl>
        )}
      </div>

      {storeId && <NotificationPermissionBanner storeId={storeId} />}
      <RealtimeConnectionBanner />
      <TableSessionSummaryBar summaries={tableSessionSummaries} />

      {!storeId && <p>Selecione uma loja para ver os pedidos.</p>}
      {isLoading && <p className="text-muted">Carregando...</p>}
      {error && <p className="text-danger">Não foi possível carregar os pedidos.</p>}

      {orders && (
        <div className="-mx-5 overflow-x-auto px-5 pb-2 md:-mx-7 md:px-7">
          <div className="grid auto-cols-[min(300px,84vw)] grid-flow-col gap-3.5 lg:auto-cols-[minmax(232px,1fr)]">
            {SCREEN_COLUMNS.map((screenColumn) => {
              const count = screenColumn.keys.reduce((sum, key) => sum + columnOrdersFor(key).length, 0)
              const isNew = screenColumn.keys[0] === 'received'
              const isFinalized = screenColumn.keys[0] === 'finalized'
              return (
                <section key={screenColumn.label} className="flex min-w-0 flex-col gap-2.5">
                  <h3 className="flex items-center gap-2 px-1 text-sm font-semibold">
                    {screenColumn.label}
                    {isNew && count > 0 ? (
                      <span className="rounded-full bg-caramel px-2 text-xs text-ink">{count}</span>
                    ) : (
                      <span className="text-muted">{count}</span>
                    )}
                    {isFinalized && count > 0 && (
                      <button
                        type="button"
                        onClick={() => clearFinalized(storeId)}
                        className="ml-auto text-xs font-normal text-muted hover:text-ink"
                      >
                        Limpar coluna
                      </button>
                    )}
                  </h3>
                  {count === 0 && <p className="px-1 text-sm text-faint">Nenhum pedido</p>}
                  {screenColumn.keys.map((key) => {
                    const columnOrders = columnOrdersFor(key)
                    // "Entregue" junta pedidos (2+) da mesma mesa num card só, pra atendente cobrar a
                    // mesa inteira. As outras colunas seguem pedido por pedido (a cozinha trabalha assim).
                    const { groups: tableGroups, ungrouped: ungroupedOrders } =
                      key === 'delivered'
                        ? groupDeliveredOrdersByTable(columnOrders)
                        : { groups: [], ungrouped: columnOrders }
                    return (
                      <div key={key} data-testid={`kanban-column-${key}`} className="flex flex-col gap-2.5">
                        {ungroupedOrders.map((order) => (
                          <OrderCard key={order.id} order={order} />
                        ))}
                        {tableGroups.map((group) => (
                          <TableGroupCard key={group.tableSessionId} orders={group.orders} />
                        ))}
                      </div>
                    )
                  })}
                </section>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
