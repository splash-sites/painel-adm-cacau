import type { Order } from '../order/Order'

export interface HourCount {
  hour: number
  count: number
}

/** Sempre as 24 horas (mesmo com 0 pedido) — eixo do gráfico fica contínuo. Cancelado não conta. */
export function calculateOrdersByHour(orders: Order[]): HourCount[] {
  const relevantOrders = orders.filter((order) => order.status !== 'cancelled')
  const countByHour = new Map<number, number>()

  for (const order of relevantOrders) {
    const hour = new Date(order.createdAt).getHours()
    countByHour.set(hour, (countByHour.get(hour) ?? 0) + 1)
  }

  return Array.from({ length: 24 }, (_, hour) => ({ hour, count: countByHour.get(hour) ?? 0 }))
}
