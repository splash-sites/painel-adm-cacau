import { calculateItemTotal } from '../product/addonPricing'
import type { Order, OrderItem, OrderStatus } from './Order'

// unitPrice/loverUnitPrice já vêm com as variações (e com o desconto do combo) aplicados pelo
// banco — aqui só entram quantidade e adicionais. Reaplicar variação em cima contava duas vezes.

/** Total de um item no preço normal. */
export function calculateItemRegularTotal(item: OrderItem): number {
  return calculateItemTotal(item.unitPrice, item.quantity, item.addons)
}

/** Total de um item no preço Lover. Pedido anterior ao Lover (sem preço congelado) cai no normal. */
export function calculateItemLoverTotal(item: OrderItem): number {
  return calculateItemTotal(
    item.loverUnitPrice ?? item.unitPrice,
    item.quantity,
    item.addons.map((addon) => ({ quantity: addon.quantity, price: addon.loverPrice ?? addon.price })),
  )
}

export function calculateOrderRegularTotal(order: Order): number {
  return order.items.reduce((sum, item) => sum + calculateItemRegularTotal(item), 0)
}

export function calculateOrderLoverTotal(order: Order): number {
  return order.items.reduce((sum, item) => sum + calculateItemLoverTotal(item), 0)
}

/** Preço Lover mais barato que o normal? Só aí vale perguntar se o cliente é Lover. */
export function hasLoverPrice(order: Order): boolean {
  return Math.round(calculateOrderLoverTotal(order) * 100) < Math.round(calculateOrderRegularTotal(order) * 100)
}

/** Avançar pra "finalized" pergunta se o cliente é Lover — só quando o preço Lover muda alguma coisa. */
export function needsLoverQuestion(orders: Order[], nextStatus: OrderStatus | null): boolean {
  return nextStatus === 'finalized' && orders.some(hasLoverPrice)
}

/**
 * Total que vale pro pedido: Lover quando o cliente foi marcado como Lover ao finalizar, normal
 * nos outros casos. Mesma fórmula no card do Dashboard e nos Relatórios, pra nunca divergir.
 */
export function calculateOrderTotal(order: Order): number {
  return order.isLover ? calculateOrderLoverTotal(order) : calculateOrderRegularTotal(order)
}
