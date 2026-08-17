import { describe, expect, it } from 'vitest'
import { calculateNewVsReturning } from './calculateNewVsReturning'
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

describe('calculateNewVsReturning', () => {
  it('returns zero for both when there are no orders', () => {
    expect(calculateNewVsReturning([], [])).toEqual({ newCustomers: 0, returningCustomers: 0 })
  })

  it('classifies a phone seen before the period as returning', () => {
    const orders = [makeOrder({ id: 'a', customerPhone: '51999990000' })]
    const result = calculateNewVsReturning(orders, ['51999990000'])
    expect(result).toEqual({ newCustomers: 0, returningCustomers: 1 })
  })

  it('classifies a phone never seen before the period as new', () => {
    const orders = [makeOrder({ id: 'a', customerPhone: '51999990000' })]
    const result = calculateNewVsReturning(orders, [])
    expect(result).toEqual({ newCustomers: 1, returningCustomers: 0 })
  })

  it('counts the same phone once even with multiple orders in the period', () => {
    const orders = [
      makeOrder({ id: 'a', customerPhone: '51999990000' }),
      makeOrder({ id: 'b', customerPhone: '51999990000' }),
    ]
    const result = calculateNewVsReturning(orders, [])
    expect(result).toEqual({ newCustomers: 1, returningCustomers: 0 })
  })

  it('ignores orders without a phone and cancelled orders', () => {
    const orders = [
      makeOrder({ id: 'a', customerPhone: null }),
      makeOrder({ id: 'b', customerPhone: '51999990000', status: 'cancelled' }),
    ]
    const result = calculateNewVsReturning(orders, [])
    expect(result).toEqual({ newCustomers: 0, returningCustomers: 0 })
  })
})
