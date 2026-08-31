import { buildReportWorkbook } from '../../infrastructure/report/export/buildReportWorkbook'
import type { ReportSummary } from '../../domain/report/ReportSummary'
import type { NewVsReturningCount } from '../../domain/report/calculateNewVsReturning'
import type { ReportPeriod } from './useReportSummary'

/** Monta o workbook (buildReportWorkbook) e dispara o download — mesmo mecanismo de useExportProducts. */
export async function downloadReportWorkbook(
  summary: ReportSummary,
  avgPrepTimeMinutes: number | null | undefined,
  newVsReturning: NewVsReturningCount | undefined,
  storeName: string,
  period: ReportPeriod,
  filename: string,
): Promise<void> {
  const buffer = await buildReportWorkbook(summary, avgPrepTimeMinutes, newVsReturning, storeName, period)

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
