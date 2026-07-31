import { describe, expect, it } from 'vitest'
import { buildReportCsv } from './exportReportCsv'
import type { ReportSummary } from '../../domain/report/ReportSummary'

function makeSummary(overrides: Partial<ReportSummary> = {}): ReportSummary {
  return {
    orderCount: 1,
    totalRevenue: 10,
    averageTicket: 10,
    cancelledCount: 0,
    topProducts: [],
    channelBreakdown: [],
    attendantRanking: [],
    ...overrides,
  }
}

describe('buildReportCsv', () => {
  it('neutraliza nome de produto começando com = (formula injection)', () => {
    const summary = makeSummary({
      topProducts: [{ productId: '1', productName: '=2+2', quantitySold: 3 }],
    })
    const csv = buildReportCsv(summary, undefined, undefined)
    expect(csv).toContain(`"'=2+2"`)
  })

  it('neutraliza +, -, @ também', () => {
    const summary = makeSummary({
      channelBreakdown: [
        { label: '+SUM(A1)', orderCount: 1, revenue: 10, averageTicket: 10 },
        { label: '-cmd', orderCount: 1, revenue: 10, averageTicket: 10 },
        { label: '@import', orderCount: 1, revenue: 10, averageTicket: 10 },
      ],
    })
    const csv = buildReportCsv(summary, undefined, undefined)
    expect(csv).toContain(`"'+SUM(A1)"`)
    expect(csv).toContain(`"'-cmd"`)
    expect(csv).toContain(`"'@import"`)
  })

  it('não mexe em texto normal', () => {
    const summary = makeSummary({
      attendantRanking: [{ attendantId: '1', attendantName: 'João Silva', orderCount: 2, revenue: 20 }],
    })
    const csv = buildReportCsv(summary, undefined, undefined)
    expect(csv).toContain(`"João Silva"`)
  })
})
