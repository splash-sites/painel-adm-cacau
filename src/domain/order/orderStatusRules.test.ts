import { describe, expect, it } from 'vitest'
import {
  KANBAN_COLUMNS,
  canCancel,
  canEditItems,
  canRevert,
  getNextStatus,
  getPreviousStatus,
  needsAttendantToAdvance,
  needsReasonToCancel,
  orderChannelLabel,
  statusLabel,
} from './orderStatusRules'
import type { OrderType } from './Order'

const ORDER_TYPES: OrderType[] = ['dine_in', 'pickup', 'delivery']

describe('getNextStatus', () => {
  it('follows full flow for pickup/delivery', () => {
    expect(getNextStatus('received', 'pickup')).toBe('preparing')
    expect(getNextStatus('preparing', 'pickup')).toBe('out_for_delivery')
    expect(getNextStatus('out_for_delivery', 'pickup')).toBe('delivered')
    expect(getNextStatus('delivered', 'pickup')).toBe('finalized')
    expect(getNextStatus('finalized', 'pickup')).toBeNull()

    expect(getNextStatus('received', 'delivery')).toBe('preparing')
    expect(getNextStatus('preparing', 'delivery')).toBe('out_for_delivery')
    expect(getNextStatus('out_for_delivery', 'delivery')).toBe('delivered')
    expect(getNextStatus('delivered', 'delivery')).toBe('finalized')
  })

  it('skips out_for_delivery for dine_in but still passes through delivered', () => {
    expect(getNextStatus('received', 'dine_in')).toBe('preparing')
    expect(getNextStatus('preparing', 'dine_in')).toBe('delivered')
    expect(getNextStatus('delivered', 'dine_in')).toBe('finalized')
    expect(getNextStatus('finalized', 'dine_in')).toBeNull()
  })

  it('returns null for cancelled (not in any flow)', () => {
    for (const type of ORDER_TYPES) {
      expect(getNextStatus('cancelled', type)).toBeNull()
    }
  })
})

describe('getPreviousStatus', () => {
  it('walks backwards through full flow', () => {
    expect(getPreviousStatus('finalized', 'delivery')).toBe('delivered')
    expect(getPreviousStatus('delivered', 'delivery')).toBe('out_for_delivery')
    expect(getPreviousStatus('out_for_delivery', 'delivery')).toBe('preparing')
    expect(getPreviousStatus('preparing', 'delivery')).toBe('received')
    expect(getPreviousStatus('received', 'delivery')).toBeNull()
  })

  it('skips out_for_delivery for dine_in but still passes through delivered', () => {
    expect(getPreviousStatus('finalized', 'dine_in')).toBe('delivered')
    expect(getPreviousStatus('delivered', 'dine_in')).toBe('preparing')
    expect(getPreviousStatus('preparing', 'dine_in')).toBe('received')
    expect(getPreviousStatus('received', 'dine_in')).toBeNull()
  })

  it('returns null for cancelled', () => {
    for (const type of ORDER_TYPES) {
      expect(getPreviousStatus('cancelled', type)).toBeNull()
    }
  })
})

describe('canCancel', () => {
  it('only allows cancel while received', () => {
    expect(canCancel('received')).toBe(true)
    expect(canCancel('preparing')).toBe(false)
    expect(canCancel('out_for_delivery')).toBe(false)
    expect(canCancel('finalized')).toBe(false)
    expect(canCancel('cancelled')).toBe(false)
  })
})

describe('needsReasonToCancel', () => {
  it('only requires reason when the order can actually be cancelled (received)', () => {
    expect(needsReasonToCancel('received')).toBe(true)
    expect(needsReasonToCancel('preparing')).toBe(false)
    expect(needsReasonToCancel('out_for_delivery')).toBe(false)
    expect(needsReasonToCancel('delivered')).toBe(false)
    expect(needsReasonToCancel('finalized')).toBe(false)
    expect(needsReasonToCancel('cancelled')).toBe(false)
  })
})

describe('canRevert', () => {
  it('allows revert only up to delivered', () => {
    expect(canRevert('preparing')).toBe(true)
    expect(canRevert('out_for_delivery')).toBe(true)
    expect(canRevert('delivered')).toBe(true)
    expect(canRevert('received')).toBe(false)
    expect(canRevert('finalized')).toBe(false)
    expect(canRevert('cancelled')).toBe(false)
  })
})

describe('canEditItems', () => {
  it('only while received', () => {
    expect(canEditItems('received')).toBe(true)
    expect(canEditItems('preparing')).toBe(false)
    expect(canEditItems('out_for_delivery')).toBe(false)
    expect(canEditItems('delivered')).toBe(false)
    expect(canEditItems('finalized')).toBe(false)
    expect(canEditItems('cancelled')).toBe(false)
  })
})

describe('needsAttendantToAdvance', () => {
  it('only requires attendant when accepting a received order', () => {
    expect(needsAttendantToAdvance('received')).toBe(true)
    expect(needsAttendantToAdvance('preparing')).toBe(false)
    expect(needsAttendantToAdvance('out_for_delivery')).toBe(false)
    expect(needsAttendantToAdvance('delivered')).toBe(false)
    expect(needsAttendantToAdvance('finalized')).toBe(false)
    expect(needsAttendantToAdvance('cancelled')).toBe(false)
  })
})

describe('orderChannelLabel', () => {
  it('labels by orderType when retail', () => {
    expect(orderChannelLabel({ orderType: 'dine_in', salesChannel: 'retail' })).toBe('Cafeteria')
    expect(orderChannelLabel({ orderType: 'pickup', salesChannel: 'retail' })).toBe('Retirar no local')
    expect(orderChannelLabel({ orderType: 'delivery', salesChannel: 'retail' })).toBe('Delivery')
  })

  it('labels Revendedor regardless of orderType when reseller channel', () => {
    expect(orderChannelLabel({ orderType: 'pickup', salesChannel: 'reseller' })).toBe('Revendedor')
  })
})

describe('statusLabel', () => {
  it('labels out_for_delivery differently for pickup', () => {
    expect(statusLabel('out_for_delivery', 'pickup')).toBe('Pronto para retirada')
    expect(statusLabel('out_for_delivery', 'delivery')).toBe('Saiu pra entrega')
    expect(statusLabel('out_for_delivery', 'dine_in')).toBe('Saiu pra entrega')
    expect(statusLabel('out_for_delivery')).toBe('Saiu pra entrega')
  })

  it('labels other statuses regardless of order type', () => {
    expect(statusLabel('received')).toBe('Recebido')
    expect(statusLabel('preparing')).toBe('Em preparo')
    expect(statusLabel('delivered')).toBe('Entregue')
    expect(statusLabel('finalized')).toBe('Finalizado')
    expect(statusLabel('cancelled')).toBe('Cancelado')
  })
})

describe('KANBAN_COLUMNS matches', () => {
  const columnFor = (order: { status: string; orderType: OrderType }) =>
    KANBAN_COLUMNS.find((c) => c.matches(order as never))?.key

  it('routes out_for_delivery to ready_for_pickup only for pickup type', () => {
    expect(columnFor({ status: 'out_for_delivery', orderType: 'pickup' })).toBe('ready_for_pickup')
    expect(columnFor({ status: 'out_for_delivery', orderType: 'delivery' })).toBe('out_for_delivery')
    expect(columnFor({ status: 'out_for_delivery', orderType: 'dine_in' })).toBe('out_for_delivery')
  })

  it('routes remaining statuses to their matching column key', () => {
    expect(columnFor({ status: 'received', orderType: 'delivery' })).toBe('received')
    expect(columnFor({ status: 'preparing', orderType: 'delivery' })).toBe('preparing')
    expect(columnFor({ status: 'delivered', orderType: 'delivery' })).toBe('delivered')
    expect(columnFor({ status: 'finalized', orderType: 'delivery' })).toBe('finalized')
  })

  it('cancelled orders match no column', () => {
    expect(columnFor({ status: 'cancelled', orderType: 'delivery' })).toBeUndefined()
  })

  it('every column key is unique', () => {
    const keys = KANBAN_COLUMNS.map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
