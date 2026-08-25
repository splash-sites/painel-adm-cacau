import { describe, expect, it } from 'vitest'
import { canCloseTableSession, groupDeliveredOrdersByTable, groupOrdersByTableSession } from './tableSessionRules'
import type { Order, OrderStatus } from './Order'

function makeOrder(overrides: Partial<Order> & { status: OrderStatus }): Order {
  return {
    id: 'order-1',
    storeId: 'store-1',
    customerId: null,
    customerName: null,
    customerCpf: null,
    customerPhone: null,
    orderType: 'dine_in',
    salesChannel: 'retail',
    tableNumber: '5',
    tableSessionId: 'session-1',
    deliveryAddress: null,
    createdAt: '2026-08-18T12:00:00.000Z',
    updatedAt: '2026-08-18T12:00:00.000Z',
    attendantId: null,
    attendantName: null,
    cancellationReason: null,
    items: [],
    ...overrides,
  }
}

describe('canCloseTableSession', () => {
  it('is false with no orders', () => {
    expect(canCloseTableSession([])).toBe(false)
  })

  it('is false while any order is still in an open-blocking status', () => {
    expect(canCloseTableSession([{ status: 'finalized' }, { status: 'preparing' }])).toBe(false)
    expect(canCloseTableSession([{ status: 'received' }])).toBe(false)
    expect(canCloseTableSession([{ status: 'delivered' }])).toBe(false)
  })

  it('is true when every order is finalized or cancelled', () => {
    expect(canCloseTableSession([{ status: 'finalized' }, { status: 'cancelled' }])).toBe(true)
    expect(canCloseTableSession([{ status: 'cancelled' }])).toBe(true)
  })
})

describe('groupOrdersByTableSession', () => {
  it('ignores orders without a table session', () => {
    const orders = [makeOrder({ status: 'received', tableSessionId: null })]
    expect(groupOrdersByTableSession(orders)).toEqual([])
  })

  it('groups orders sharing the same tableSessionId and sums their total', () => {
    const orders = [
      makeOrder({
        id: 'a',
        status: 'preparing',
        items: [
          { id: 'i1', productId: 'p1', productName: 'Café', quantity: 2, unitPrice: 10, notes: null, addons: [], variations: [], promotionId: null },
        ],
      }),
      makeOrder({
        id: 'b',
        status: 'received',
        items: [
          { id: 'i2', productId: 'p2', productName: 'Bolo', quantity: 1, unitPrice: 15, notes: null, addons: [], variations: [], promotionId: null },
        ],
      }),
      makeOrder({ id: 'c', status: 'finalized', tableSessionId: 'session-2', tableNumber: '9' }),
    ]

    const summaries = groupOrdersByTableSession(orders)

    expect(summaries).toHaveLength(2)
    const session1 = summaries.find((s) => s.tableSessionId === 'session-1')
    expect(session1).toMatchObject({ tableNumber: '5', orderCount: 2, total: 35, canClose: false })

    const session2 = summaries.find((s) => s.tableSessionId === 'session-2')
    expect(session2).toMatchObject({ tableNumber: '9', orderCount: 1, total: 0, canClose: true })
  })
})

describe('groupDeliveredOrdersByTable', () => {
  it('leaves a lone delivered order (or one without a table session) ungrouped', () => {
    const orders = [
      makeOrder({ id: 'a', status: 'delivered' }),
      makeOrder({ id: 'b', status: 'delivered', tableSessionId: null }),
    ]

    const { groups, ungrouped } = groupDeliveredOrdersByTable(orders)

    expect(groups).toEqual([])
    expect(ungrouped.map((o) => o.id).sort()).toEqual(['a', 'b'])
  })

  it('groups 2+ delivered orders sharing the same table session', () => {
    const orders = [
      makeOrder({ id: 'a', status: 'delivered' }),
      makeOrder({ id: 'b', status: 'delivered' }),
      makeOrder({ id: 'c', status: 'delivered', tableSessionId: 'session-2', tableNumber: '9' }),
    ]

    const { groups, ungrouped } = groupDeliveredOrdersByTable(orders)

    expect(ungrouped.map((o) => o.id)).toEqual(['c'])
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ tableSessionId: 'session-1', tableNumber: '5' })
    expect(groups[0].orders.map((o) => o.id)).toEqual(['a', 'b'])
  })

  it('only groups orders that are actually in delivered status', () => {
    const orders = [
      makeOrder({ id: 'a', status: 'delivered' }),
      makeOrder({ id: 'b', status: 'preparing' }),
    ]

    const { groups, ungrouped } = groupDeliveredOrdersByTable(orders)

    expect(groups).toEqual([])
    expect(ungrouped.map((o) => o.id).sort()).toEqual(['a', 'b'])
  })
})
