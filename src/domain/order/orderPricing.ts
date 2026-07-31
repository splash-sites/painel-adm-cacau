import { calculateItemTotal } from '../product/addonPricing'
import { applyVariationsToUnitPrice } from '../product/variationPricing'
import type { Order } from './Order'

/** Total do pedido — mesma fórmula usada no card do Dashboard, reaproveitada nos relatórios pra nunca divergir. */
export function calculateOrderTotal(order: Order): number {
  return order.items.reduce((sum, item) => {
    const effectiveUnitPrice = applyVariationsToUnitPrice(item.unitPrice, item.variations)
    return sum + calculateItemTotal(effectiveUnitPrice, item.quantity, item.addons)
  }, 0)
}
