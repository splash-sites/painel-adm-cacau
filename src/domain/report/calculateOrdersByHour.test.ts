import { describe, expect, it } from 'vitest'
import { calculateOrdersByHour } from './calculateOrdersByHour'
import type { Order, OrderStatus, OrderType, SalesChannel } from '../order/Order'

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    storeId: 'store-1',
    customerId: null,
    customerName: null,
    customerCpf: null,
    customerPhone: null,
    orderType: 'pickup' as OrderType,
    status: 'finalized' as OrderStatus,
    salesChannel: 'retail' as SalesChannel,
    tableNumber: null,
    deliveryAddress: null,
    createdAt: '2026-07-28T12:00:00.000Z',
    updatedAt: '2026-07-28T12:00:00.000Z',
    attendantId: null,
    attendantName: null,
    cancellationReason: null,
    items: [],
    ...overrides,
  }
}

describe('calculateOrdersByHour', () => {
  it('always returns 24 hours, zeroed with no orders', () => {
    const result = calculateOrdersByHour([])
    expect(result).toHaveLength(24)
    expect(result.every((point) => point.count === 0)).toBe(true)
    expect(result.map((point) => point.hour)).toEqual(Array.from({ length: 24 }, (_, hour) => hour))
  })

  it('excludes cancelled orders', () => {
    const orders = [makeOrder({ status: 'cancelled', createdAt: '2026-07-28T12:00:00.000Z' })]
    const result = calculateOrdersByHour(orders)
    expect(result.every((point) => point.count === 0)).toBe(true)
  })

  it('counts orders in their local hour bucket', () => {
    const sameHour = new Date()
    sameHour.setHours(10, 15, 0, 0)
    const otherOrder = new Date()
    otherOrder.setHours(10, 45, 0, 0)

    const orders = [
      makeOrder({ id: 'a', createdAt: sameHour.toISOString() }),
      makeOrder({ id: 'b', createdAt: otherOrder.toISOString() }),
    ]
    const result = calculateOrdersByHour(orders)
    expect(result.find((point) => point.hour === 10)?.count).toBe(2)
  })
})
