import { describe, expect, it } from 'vitest'
import type { Order, OrderItem } from './Order'
import {
  calculateItemLoverTotal,
  calculateItemRegularTotal,
  calculateOrderLoverTotal,
  calculateOrderRegularTotal,
  calculateOrderTotal,
  hasLoverPrice,
  needsLoverQuestion,
} from './orderPricing'

function makeItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: 'i1',
    productId: 'p1',
    productName: 'Fondue',
    quantity: 1,
    unitPrice: 30,
    loverUnitPrice: 27,
    notes: null,
    addons: [],
    variations: [],
    promotionId: null,
    ...overrides,
  }
}

function makeOrder(items: OrderItem[], isLover: boolean | null = null): Order {
  return {
    id: 'o1',
    storeId: 's1',
    customerId: null,
    customerName: null,
    customerCpf: null,
    customerPhone: null,
    orderType: 'pickup',
    status: 'delivered',
    salesChannel: 'retail',
    tableNumber: null,
    tableSessionId: null,
    deliveryAddress: null,
    createdAt: '2026-10-11T12:00:00Z',
    updatedAt: '2026-10-11T12:00:00Z',
    items,
    attendantId: null,
    attendantName: null,
    cancellationReason: null,
    isLover,
  }
}

describe('preço do item', () => {
  it('não reaplica variação em cima do unitPrice (já vem com ela)', () => {
    const item = makeItem({
      unitPrice: 21.52, // combo com desconto, variação "Banana" (replace, 24) já embutida
      variations: [{ id: 'v', variationOptionId: 'vo', name: 'Banana', price: 24, loverPrice: 21, priceMode: 'replace' }],
      promotionId: 'promo',
    })
    expect(calculateItemRegularTotal(item)).toBe(21.52)
  })

  it('adicional por unidade × quantidade, normal e Lover', () => {
    const item = makeItem({
      quantity: 2,
      unitPrice: 8,
      loverUnitPrice: 7,
      addons: [{ id: 'a', addonOptionId: 'ao', name: 'Morango', price: 9, loverPrice: 8, quantity: 1 }],
    })
    expect(calculateItemRegularTotal(item)).toBe(34)
    expect(calculateItemLoverTotal(item)).toBe(30)
  })

  it('pedido anterior ao Lover (sem preço congelado) usa o normal no Lover', () => {
    const item = makeItem({
      loverUnitPrice: null,
      addons: [{ id: 'a', addonOptionId: 'ao', name: 'Morango', price: 9, loverPrice: null, quantity: 1 }],
    })
    expect(calculateItemLoverTotal(item)).toBe(calculateItemRegularTotal(item))
  })
})

describe('total do pedido', () => {
  const items = [makeItem(), makeItem({ id: 'i2', unitPrice: 10, loverUnitPrice: 10 })]

  it('normal e Lover lado a lado', () => {
    expect(calculateOrderRegularTotal(makeOrder(items))).toBe(40)
    expect(calculateOrderLoverTotal(makeOrder(items))).toBe(37)
  })

  it('vale o Lover só quando o cliente foi marcado como Lover', () => {
    expect(calculateOrderTotal(makeOrder(items, true))).toBe(37)
    expect(calculateOrderTotal(makeOrder(items, false))).toBe(40)
    expect(calculateOrderTotal(makeOrder(items, null))).toBe(40)
  })

  it('hasLoverPrice só quando o Lover é mais barato', () => {
    expect(hasLoverPrice(makeOrder(items))).toBe(true)
    expect(hasLoverPrice(makeOrder([makeItem({ loverUnitPrice: 30 })]))).toBe(false)
    expect(hasLoverPrice(makeOrder([makeItem({ loverUnitPrice: null })]))).toBe(false)
  })
})

describe('needsLoverQuestion', () => {
  const lover = makeOrder([makeItem()])
  const same = makeOrder([makeItem({ loverUnitPrice: 30 })])

  it('pergunta só ao finalizar e só se algum pedido tem preço Lover menor', () => {
    expect(needsLoverQuestion([lover], 'finalized')).toBe(true)
    expect(needsLoverQuestion([same, lover], 'finalized')).toBe(true)
    expect(needsLoverQuestion([same], 'finalized')).toBe(false)
    expect(needsLoverQuestion([lover], 'delivered')).toBe(false)
    expect(needsLoverQuestion([lover], null)).toBe(false)
  })
})
