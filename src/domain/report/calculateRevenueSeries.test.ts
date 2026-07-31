import { describe, expect, it } from 'vitest'
import { calculateRevenueSeries } from './calculateRevenueSeries'
import type { Order, OrderItem, OrderStatus, OrderType, SalesChannel } from '../order/Order'

function makeItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: 'item-1',
    productId: 'product-1',
    productName: 'Capuccino',
    quantity: 1,
    unitPrice: 8,
    notes: null,
    addons: [],
    variations: [],
    ...overrides,
  }
}

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
    items: [makeItem()],
    ...overrides,
  }
}

describe('calculateRevenueSeries', () => {
  it('returns empty array with no orders', () => {
    expect(calculateRevenueSeries([], 'day')).toEqual([])
  })

  it('excludes cancelled orders', () => {
    const orders = [makeOrder({ status: 'cancelled' })]
    expect(calculateRevenueSeries(orders, 'day')).toEqual([])
  })

  it('buckets by hour of day and sorts chronologically', () => {
    const early = new Date()
    early.setHours(9, 30, 0, 0)
    const late = new Date()
    late.setHours(14, 0, 0, 0)

    const orders = [
      makeOrder({ id: 'a', createdAt: late.toISOString(), items: [makeItem({ unitPrice: 10 })] }),
      makeOrder({ id: 'b', createdAt: early.toISOString(), items: [makeItem({ unitPrice: 5 })] }),
    ]
    const series = calculateRevenueSeries(orders, 'hour')
    const hours = series.map((point) => point.label)
    expect(hours.indexOf('09:00')).toBeLessThan(hours.indexOf('14:00'))
    expect(series.find((point) => point.label === '09:00')?.revenue).toBe(5)
    expect(series.find((point) => point.label === '14:00')?.revenue).toBe(10)
  })

  it('buckets by day across month boundary in correct chronological order', () => {
    const orders = [
      makeOrder({ id: 'a', createdAt: '2026-08-02T15:00:00.000Z', items: [makeItem({ unitPrice: 10 })] }),
      makeOrder({ id: 'b', createdAt: '2026-07-30T15:00:00.000Z', items: [makeItem({ unitPrice: 5 })] }),
    ]
    const series = calculateRevenueSeries(orders, 'day')
    expect(series.map((point) => point.label)).toEqual(['30/07', '02/08'])
  })
})
