import { describe, expect, it } from 'vitest'
import { calculateReportSummary } from './calculateReportSummary'
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
    tableSessionId: null,
    deliveryAddress: null,
    createdAt: '2026-07-28T12:00:00.000Z',
    updatedAt: '2026-07-28T12:00:00.000Z',
    attendantId: null,
    attendantName: null,
    cancellationReason: null,
    items: [makeItem()],
    ...overrides,
  }
}

describe('calculateReportSummary', () => {
  it('returns zeroed summary with no orders', () => {
    const summary = calculateReportSummary([])
    expect(summary).toEqual({
      orderCount: 0,
      totalRevenue: 0,
      averageTicket: 0,
      cancelledCount: 0,
      topProducts: [],
      channelBreakdown: [],
      attendantRanking: [],
    })
  })

  it('excludes cancelled orders from revenue, count and ranking, but counts them in cancelledCount', () => {
    const orders = [
      makeOrder({ id: 'a', status: 'finalized' }),
      makeOrder({ id: 'b', status: 'cancelled' }),
    ]
    const summary = calculateReportSummary(orders)
    expect(summary.orderCount).toBe(1)
    expect(summary.totalRevenue).toBe(8)
    expect(summary.cancelledCount).toBe(1)
  })

  it('counts delivered/preparing orders in orderCount, but not in revenue/average ticket', () => {
    const orders = [
      makeOrder({ id: 'a', status: 'finalized', items: [makeItem({ unitPrice: 10 })] }),
      makeOrder({ id: 'b', status: 'delivered', items: [makeItem({ unitPrice: 999 })] }),
      makeOrder({ id: 'c', status: 'preparing', items: [makeItem({ unitPrice: 999 })] }),
    ]
    const summary = calculateReportSummary(orders)
    expect(summary.orderCount).toBe(3)
    expect(summary.totalRevenue).toBe(10)
    expect(summary.averageTicket).toBe(10)
  })

  it('computes total revenue and average ticket across orders', () => {
    const orders = [
      makeOrder({ id: 'a', items: [makeItem({ quantity: 2, unitPrice: 8 })] }), // 16
      makeOrder({ id: 'b', items: [makeItem({ quantity: 1, unitPrice: 25 })] }), // 25
    ]
    const summary = calculateReportSummary(orders)
    expect(summary.totalRevenue).toBe(41)
    expect(summary.orderCount).toBe(2)
    expect(summary.averageTicket).toBe(20.5)
  })

  it('ranks products by total quantity sold across orders, descending', () => {
    const orders = [
      makeOrder({
        id: 'a',
        items: [
          makeItem({ productId: 'p1', productName: 'Capuccino', quantity: 3 }),
          makeItem({ id: 'item-2', productId: 'p2', productName: 'Torrada', quantity: 1 }),
        ],
      }),
      makeOrder({
        id: 'b',
        items: [makeItem({ productId: 'p2', productName: 'Torrada', quantity: 5 })],
      }),
    ]
    const summary = calculateReportSummary(orders)
    expect(summary.topProducts).toEqual([
      { productId: 'p2', productName: 'Torrada', quantitySold: 6 },
      { productId: 'p1', productName: 'Capuccino', quantitySold: 3 },
    ])
  })

  it('breaks down orders by channel, descending by count, with revenue and average ticket', () => {
    const orders = [
      makeOrder({ id: 'a', orderType: 'dine_in', items: [makeItem({ unitPrice: 10 })] }),
      makeOrder({ id: 'b', orderType: 'dine_in', items: [makeItem({ unitPrice: 20 })] }),
      makeOrder({ id: 'c', orderType: 'delivery', items: [makeItem({ unitPrice: 15 })] }),
      makeOrder({ id: 'd', salesChannel: 'reseller', orderType: 'pickup', items: [makeItem({ unitPrice: 8 })] }),
    ]
    const summary = calculateReportSummary(orders)
    expect(summary.channelBreakdown).toEqual([
      { label: 'Cafeteria', orderCount: 2, revenue: 30, averageTicket: 15 },
      { label: 'Delivery', orderCount: 1, revenue: 15, averageTicket: 15 },
      { label: 'Revendedor', orderCount: 1, revenue: 8, averageTicket: 8 },
    ])
  })

  it('counts a delivered order in the channel orderCount, but not in its revenue/average ticket', () => {
    const orders = [
      makeOrder({ id: 'a', orderType: 'dine_in', status: 'finalized', items: [makeItem({ unitPrice: 10 })] }),
      makeOrder({ id: 'b', orderType: 'dine_in', status: 'delivered', items: [makeItem({ unitPrice: 999 })] }),
    ]
    const summary = calculateReportSummary(orders)
    expect(summary.channelBreakdown).toEqual([{ label: 'Cafeteria', orderCount: 2, revenue: 10, averageTicket: 10 }])
  })

  it('ranks attendants by order count, descending, with revenue, ignoring null attendant and cancelled orders', () => {
    const orders = [
      makeOrder({ id: 'a', attendantId: 'att-1', attendantName: 'Ana', items: [makeItem({ unitPrice: 10 })] }),
      makeOrder({ id: 'b', attendantId: 'att-1', attendantName: 'Ana', items: [makeItem({ unitPrice: 12 })] }),
      makeOrder({ id: 'c', attendantId: 'att-2', attendantName: 'Bruno', items: [makeItem({ unitPrice: 20 })] }),
      makeOrder({ id: 'd', attendantId: null, attendantName: null }),
      makeOrder({ id: 'e', status: 'cancelled', attendantId: 'att-2', attendantName: 'Bruno' }),
    ]
    const summary = calculateReportSummary(orders)
    expect(summary.attendantRanking).toEqual([
      { attendantId: 'att-1', attendantName: 'Ana', orderCount: 2, revenue: 22 },
      { attendantId: 'att-2', attendantName: 'Bruno', orderCount: 1, revenue: 20 },
    ])
  })

  it('counts a delivered order towards attendant orderCount, but not towards revenue', () => {
    const orders = [
      makeOrder({ id: 'a', status: 'finalized', attendantId: 'att-1', attendantName: 'Ana', items: [makeItem({ unitPrice: 10 })] }),
      makeOrder({ id: 'b', status: 'delivered', attendantId: 'att-1', attendantName: 'Ana', items: [makeItem({ unitPrice: 999 })] }),
    ]
    const summary = calculateReportSummary(orders)
    expect(summary.attendantRanking).toEqual([{ attendantId: 'att-1', attendantName: 'Ana', orderCount: 2, revenue: 10 }])
  })

  it('reuses the addon/variation-aware pricing formula for revenue', () => {
    const orders = [
      makeOrder({
        id: 'a',
        items: [
          makeItem({
            quantity: 2,
            unitPrice: 8,
            addons: [{ id: 'ad1', addonOptionId: 'opt1', name: 'Morango', price: 9, quantity: 1 }],
          }),
        ],
      }),
    ]
    const summary = calculateReportSummary(orders)
    expect(summary.totalRevenue).toBe(34) // (8 + 9) * 2
  })
})
