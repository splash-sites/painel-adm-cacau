import { describe, expect, it } from 'vitest'
import { dashboardFinalizedCutoff, sinceIsoForPeriod } from './orderPeriod'

describe('sinceIsoForPeriod', () => {
  it('returns start of today (local midnight) for "today"', () => {
    const since = new Date(sinceIsoForPeriod('today'))
    expect(since.getHours()).toBe(0)
    expect(since.getMinutes()).toBe(0)
    expect(since.getSeconds()).toBe(0)
    expect(since.toDateString()).toBe(new Date().toDateString())
  })

  it('returns roughly 7 days ago for "7d"', () => {
    const since = new Date(sinceIsoForPeriod('7d'))
    const diffDays = (Date.now() - since.getTime()) / (24 * 60 * 60 * 1000)
    expect(diffDays).toBeGreaterThan(6.9)
    expect(diffDays).toBeLessThan(7.1)
  })

  it('returns roughly 30 days ago for "30d"', () => {
    const since = new Date(sinceIsoForPeriod('30d'))
    const diffDays = (Date.now() - since.getTime()) / (24 * 60 * 60 * 1000)
    expect(diffDays).toBeGreaterThan(29.9)
    expect(diffDays).toBeLessThan(30.1)
  })
})

describe('dashboardFinalizedCutoff', () => {
  it('sem limpeza manual, corta no início do dia de hoje', () => {
    const cutoff = new Date(dashboardFinalizedCutoff(null))
    expect(cutoff.getHours()).toBe(0)
    expect(cutoff.toDateString()).toBe(new Date().toDateString())
  })

  it('limpeza manual feita hoje prevalece sobre o início do dia', () => {
    const clearedAt = new Date().toISOString()
    expect(dashboardFinalizedCutoff(clearedAt)).toBe(clearedAt)
  })

  it('limpeza manual de dia anterior é ignorada — início de hoje já é mais recente (reset automático à meia-noite)', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const cutoff = new Date(dashboardFinalizedCutoff(yesterday.toISOString()))
    expect(cutoff.toDateString()).toBe(new Date().toDateString())
    expect(cutoff.getHours()).toBe(0)
  })
})
