import type { Order } from '../../domain/order/Order'
import { calculateOrderLoverTotal, calculateOrderRegularTotal, hasLoverPrice } from '../../domain/order/orderPricing'
import { formatCurrency } from './orderCardFormat'

/** Linha abaixo do total: o preço Lover enquanto não perguntou; depois, se o cliente era Lover. */
export function LoverTotalHint({ order }: { order: Order }) {
  if (!hasLoverPrice(order)) return null

  if (order.isLover === true) {
    return (
      <span className="block text-xs text-secondary">
        Cacau Lover · normal {formatCurrency(calculateOrderRegularTotal(order))}
      </span>
    )
  }
  if (order.isLover === false) return null

  return (
    <span className="block text-xs text-secondary">Lover {formatCurrency(calculateOrderLoverTotal(order))}</span>
  )
}
