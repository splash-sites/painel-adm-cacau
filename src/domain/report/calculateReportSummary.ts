import { orderChannelLabel } from '../order/orderStatusRules'
import { calculateOrderTotal } from '../order/orderPricing'
import type { Order } from '../order/Order'
import type { AttendantRanking, ChannelCount, ProductRanking, ReportSummary } from './ReportSummary'

/** Cancelado não conta pra faturamento/ticket médio/ranking — pedido que não virou venda. */
export function calculateReportSummary(orders: Order[]): ReportSummary {
  const relevantOrders = orders.filter((order) => order.status !== 'cancelled')
  const cancelledCount = orders.length - relevantOrders.length

  const totalRevenue = relevantOrders.reduce((sum, order) => sum + calculateOrderTotal(order), 0)
  const orderCount = relevantOrders.length
  const averageTicket = orderCount > 0 ? totalRevenue / orderCount : 0

  const quantityByProduct = new Map<string, { name: string; quantity: number }>()
  for (const order of relevantOrders) {
    for (const item of order.items) {
      const current = quantityByProduct.get(item.productId) ?? { name: item.productName, quantity: 0 }
      current.quantity += item.quantity
      quantityByProduct.set(item.productId, current)
    }
  }
  const topProducts: ProductRanking[] = [...quantityByProduct.entries()]
    .map(([productId, { name, quantity }]) => ({ productId, productName: name, quantitySold: quantity }))
    .sort((a, b) => b.quantitySold - a.quantitySold)

  const countByChannel = new Map<string, { count: number; revenue: number }>()
  for (const order of relevantOrders) {
    const label = orderChannelLabel(order)
    const current = countByChannel.get(label) ?? { count: 0, revenue: 0 }
    current.count += 1
    current.revenue += calculateOrderTotal(order)
    countByChannel.set(label, current)
  }
  const channelBreakdown: ChannelCount[] = [...countByChannel.entries()]
    .map(([label, { count, revenue }]) => ({
      label,
      orderCount: count,
      revenue,
      averageTicket: count > 0 ? revenue / count : 0,
    }))
    .sort((a, b) => b.orderCount - a.orderCount)

  const countByAttendant = new Map<string, { name: string; count: number; revenue: number }>()
  for (const order of relevantOrders) {
    if (!order.attendantId) continue
    const current = countByAttendant.get(order.attendantId) ?? {
      name: order.attendantName ?? '—',
      count: 0,
      revenue: 0,
    }
    current.count += 1
    current.revenue += calculateOrderTotal(order)
    countByAttendant.set(order.attendantId, current)
  }
  const attendantRanking: AttendantRanking[] = [...countByAttendant.entries()]
    .map(([attendantId, { name, count, revenue }]) => ({
      attendantId,
      attendantName: name,
      orderCount: count,
      revenue,
    }))
    .sort((a, b) => b.orderCount - a.orderCount)

  return {
    orderCount,
    totalRevenue,
    averageTicket,
    cancelledCount,
    topProducts,
    channelBreakdown,
    attendantRanking,
  }
}
