import { orderChannelLabel } from '../order/orderStatusRules'
import { calculateOrderTotal } from '../order/orderPricing'
import type { Order } from '../order/Order'
import type { AttendantRanking, ChannelCount, ProductRanking, ReportSummary } from './ReportSummary'

/**
 * Cancelado não conta em nenhuma métrica — só em cancelledCount, pra taxa de cancelamento.
 * Dinheiro (totalRevenue/averageTicket, e revenue/averageTicket por canal e por atendente)
 * só considera pedido "finalized" — "delivered" (cliente já recebeu, ainda não pagou) e as
 * etapas anteriores contam em orderCount/ranking de quantidade, mas nunca em faturamento.
 */
export function calculateReportSummary(orders: Order[]): ReportSummary {
  const nonCancelledOrders = orders.filter((order) => order.status !== 'cancelled')
  const cancelledCount = orders.length - nonCancelledOrders.length
  const orderCount = nonCancelledOrders.length

  const paidOrders = nonCancelledOrders.filter((order) => order.status === 'finalized')
  const totalRevenue = paidOrders.reduce((sum, order) => sum + calculateOrderTotal(order), 0)
  const averageTicket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0

  const quantityByProduct = new Map<string, { name: string; quantity: number }>()
  for (const order of nonCancelledOrders) {
    for (const item of order.items) {
      const current = quantityByProduct.get(item.productId) ?? { name: item.productName, quantity: 0 }
      current.quantity += item.quantity
      quantityByProduct.set(item.productId, current)
    }
  }
  const topProducts: ProductRanking[] = [...quantityByProduct.entries()]
    .map(([productId, { name, quantity }]) => ({ productId, productName: name, quantitySold: quantity }))
    .sort((a, b) => b.quantitySold - a.quantitySold)

  const countByChannel = new Map<string, { count: number; revenue: number; paidCount: number }>()
  for (const order of nonCancelledOrders) {
    const label = orderChannelLabel(order)
    const current = countByChannel.get(label) ?? { count: 0, revenue: 0, paidCount: 0 }
    current.count += 1
    if (order.status === 'finalized') {
      current.revenue += calculateOrderTotal(order)
      current.paidCount += 1
    }
    countByChannel.set(label, current)
  }
  const channelBreakdown: ChannelCount[] = [...countByChannel.entries()]
    .map(([label, { count, revenue, paidCount }]) => ({
      label,
      orderCount: count,
      revenue,
      averageTicket: paidCount > 0 ? revenue / paidCount : 0,
    }))
    .sort((a, b) => b.orderCount - a.orderCount)

  const countByAttendant = new Map<string, { name: string; count: number; revenue: number }>()
  for (const order of nonCancelledOrders) {
    if (!order.attendantId) continue
    const current = countByAttendant.get(order.attendantId) ?? {
      name: order.attendantName ?? '—',
      count: 0,
      revenue: 0,
    }
    current.count += 1
    if (order.status === 'finalized') {
      current.revenue += calculateOrderTotal(order)
    }
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
