import { calculateOrderTotal } from '../order/orderPricing'
import type { Order } from '../order/Order'

export interface RevenuePoint {
  label: string
  revenue: number
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function dayLabel(dateKey: string): string {
  const [, month, day] = dateKey.split('-')
  return `${day}/${month}`
}

/**
 * 'hour' agrupa por hora do dia (0-23, pro filtro Hoje). 'day' agrupa por data (pro 7d/30d).
 * Sempre em horário local (mesmo padrão de startOfTodayIso), nunca UTC — evita pedido de
 * madrugada cair no dia errado.
 */
export function calculateRevenueSeries(orders: Order[], granularity: 'hour' | 'day'): RevenuePoint[] {
  const relevantOrders = orders.filter((order) => order.status !== 'cancelled')
  const revenueByKey = new Map<string, number>()

  for (const order of relevantOrders) {
    const date = new Date(order.createdAt)
    const key = granularity === 'hour' ? String(date.getHours()).padStart(2, '0') : localDateKey(date)
    revenueByKey.set(key, (revenueByKey.get(key) ?? 0) + calculateOrderTotal(order))
  }

  return [...revenueByKey.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, revenue]) => ({
      label: granularity === 'hour' ? `${key}:00` : dayLabel(key),
      revenue,
    }))
}
