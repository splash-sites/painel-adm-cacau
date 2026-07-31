import { describe, expect, it } from 'vitest'
import { calculateAveragePrepTimeMinutes, type StatusHistoryEntry } from './calculatePrepTime'

describe('calculateAveragePrepTimeMinutes', () => {
  it('returns null with no entries', () => {
    expect(calculateAveragePrepTimeMinutes([])).toBeNull()
  })

  it('returns null when no order completed the preparing phase', () => {
    const entries: StatusHistoryEntry[] = [
      { orderId: 'a', status: 'received', changedAt: '2026-07-28T12:00:00.000Z' },
      { orderId: 'a', status: 'preparing', changedAt: '2026-07-28T12:05:00.000Z' },
    ]
    expect(calculateAveragePrepTimeMinutes(entries)).toBeNull()
  })

  it('computes minutes between entering and leaving preparing for a single order', () => {
    const entries: StatusHistoryEntry[] = [
      { orderId: 'a', status: 'received', changedAt: '2026-07-28T12:00:00.000Z' },
      { orderId: 'a', status: 'preparing', changedAt: '2026-07-28T12:05:00.000Z' },
      { orderId: 'a', status: 'finalized', changedAt: '2026-07-28T12:20:00.000Z' },
    ]
    expect(calculateAveragePrepTimeMinutes(entries)).toBe(15)
  })

  it('averages across multiple orders, ignoring entry order in the array', () => {
    const entries: StatusHistoryEntry[] = [
      { orderId: 'b', status: 'preparing', changedAt: '2026-07-28T13:00:00.000Z' },
      { orderId: 'a', status: 'preparing', changedAt: '2026-07-28T12:05:00.000Z' },
      { orderId: 'a', status: 'finalized', changedAt: '2026-07-28T12:15:00.000Z' }, // 10 min
      { orderId: 'b', status: 'out_for_delivery', changedAt: '2026-07-28T13:20:00.000Z' }, // 20 min
    ]
    expect(calculateAveragePrepTimeMinutes(entries)).toBe(15)
  })
})
