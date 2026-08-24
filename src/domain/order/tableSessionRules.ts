import type { Order, OrderStatus } from './Order'
import { calculateOrderTotal } from './orderPricing'

const OPEN_BLOCKING_STATUSES: OrderStatus[] = [
  'received',
  'preparing',
  'out_for_delivery',
  'delivered',
]

export interface TableSessionSummary {
  tableSessionId: string
  tableNumber: string
  orderCount: number
  total: number
  canClose: boolean
}

/** Comanda só fecha quando todo pedido vinculado já tá finalized/cancelled — reforçado também em RPC (close_table_session). */
export function canCloseTableSession(orders: Pick<Order, 'status'>[]): boolean {
  return orders.length > 0 && orders.every((order) => !OPEN_BLOCKING_STATUSES.includes(order.status))
}

/** Agrupa pedidos dine_in pelo table_session_id em comum — usado pro resumo consolidado no Dashboard. */
export function groupOrdersByTableSession(orders: Order[]): TableSessionSummary[] {
  const groups = new Map<string, Order[]>()

  for (const order of orders) {
    if (!order.tableSessionId) continue
    const group = groups.get(order.tableSessionId) ?? []
    group.push(order)
    groups.set(order.tableSessionId, group)
  }

  return Array.from(groups.entries()).map(([tableSessionId, sessionOrders]) => ({
    tableSessionId,
    tableNumber: sessionOrders[0].tableNumber ?? '',
    orderCount: sessionOrders.length,
    total: sessionOrders.reduce((sum, order) => sum + calculateOrderTotal(order), 0),
    canClose: canCloseTableSession(sessionOrders),
  }))
}

export interface DeliveredTableGroup {
  tableSessionId: string
  tableNumber: string
  orders: Order[]
}

/**
 * Cards ficam individuais em received/preparing (cozinha trabalha pedido a pedido) — só na coluna
 * "Entregue" pedidos da mesma mesa (2+) viram 1 card só, pra facilitar a atendente cobrar a mesa
 * inteira de uma vez. Pedido sozinho na mesa (ou sem tableSessionId) continua card normal.
 */
export function groupDeliveredOrdersByTable(deliveredOrders: Order[]): {
  groups: DeliveredTableGroup[]
  ungrouped: Order[]
} {
  const bySession = new Map<string, Order[]>()
  const ungrouped: Order[] = []

  for (const order of deliveredOrders) {
    if (order.status !== 'delivered' || !order.tableSessionId) {
      ungrouped.push(order)
      continue
    }
    const list = bySession.get(order.tableSessionId) ?? []
    list.push(order)
    bySession.set(order.tableSessionId, list)
  }

  const groups: DeliveredTableGroup[] = []
  for (const [tableSessionId, sessionOrders] of bySession) {
    if (sessionOrders.length >= 2) {
      groups.push({ tableSessionId, tableNumber: sessionOrders[0].tableNumber ?? '', orders: sessionOrders })
    } else {
      ungrouped.push(...sessionOrders)
    }
  }

  return { groups, ungrouped }
}
