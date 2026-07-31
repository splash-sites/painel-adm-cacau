import type { ReportSummary } from '../../domain/report/ReportSummary'
import type { NewVsReturningCount } from '../../domain/report/calculateNewVsReturning'

// Neutraliza formula injection (nome de produto/atendente/canal pode ser texto livre digitado por alguém) —
// Excel/Sheets interpretam célula começando com =/+/-/@ como fórmula ao abrir o CSV.
function neutralizeFormula(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value
}

function csvCell(value: string | number): string {
  if (typeof value === 'number') return value.toFixed(2)
  return `"${neutralizeFormula(value).replace(/"/g, '""')}"`
}

export function buildReportCsv(
  summary: ReportSummary,
  avgPrepTimeMinutes: number | null | undefined,
  newVsReturning: NewVsReturningCount | undefined,
): string {
  const lines: string[] = []

  lines.push('Métrica,Valor')
  lines.push(`Faturamento,${csvCell(summary.totalRevenue)}`)
  lines.push(`Pedidos,${summary.orderCount}`)
  lines.push(`Ticket médio,${csvCell(summary.averageTicket)}`)
  lines.push(`Cancelados,${summary.cancelledCount}`)
  if (avgPrepTimeMinutes != null) lines.push(`Tempo médio de preparo (min),${csvCell(avgPrepTimeMinutes)}`)
  if (newVsReturning) {
    lines.push(`Clientes novos,${newVsReturning.newCustomers}`)
    lines.push(`Clientes recorrentes,${newVsReturning.returningCustomers}`)
  }
  lines.push('')

  lines.push('Produto,Quantidade vendida')
  for (const product of summary.topProducts) {
    lines.push(`${csvCell(product.productName)},${product.quantitySold}`)
  }
  lines.push('')

  lines.push('Canal,Pedidos,Faturamento,Ticket médio')
  for (const channel of summary.channelBreakdown) {
    lines.push(
      `${csvCell(channel.label)},${channel.orderCount},${csvCell(channel.revenue)},${csvCell(channel.averageTicket)}`,
    )
  }
  lines.push('')

  lines.push('Atendente,Pedidos,Faturamento')
  for (const attendant of summary.attendantRanking) {
    lines.push(`${csvCell(attendant.attendantName)},${attendant.orderCount},${csvCell(attendant.revenue)}`)
  }

  return lines.join('\n')
}

export function downloadReportCsv(
  summary: ReportSummary,
  avgPrepTimeMinutes: number | null | undefined,
  newVsReturning: NewVsReturningCount | undefined,
  filename: string,
): void {
  const csv = buildReportCsv(summary, avgPrepTimeMinutes, newVsReturning)
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
