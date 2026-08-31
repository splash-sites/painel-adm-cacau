import ExcelJS from 'exceljs'
import type { ReportSummary } from '../../../domain/report/ReportSummary'
import type { NewVsReturningCount } from '../../../domain/report/calculateNewVsReturning'
import { XLSX_ACCENT, XLSX_CREAM, XLSX_PRIMARY, XLSX_ROW_ALT, XLSX_SECONDARY } from '../../export/xlsxTheme'

const PERIOD_LABEL = { today: 'Hoje', '7d': '7 dias', '30d': '30 dias' } as const

function addTitleBlock(sheet: ExcelJS.Worksheet, title: string, subtitle: string, lastColumn: number) {
  const titleRow = sheet.addRow([title])
  sheet.mergeCells(1, 1, 1, lastColumn)
  titleRow.height = 28
  titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_ACCENT } }
  titleRow.getCell(1).font = { size: 15, bold: true, color: { argb: XLSX_CREAM } }
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

  const subtitleRow = sheet.addRow([subtitle])
  sheet.mergeCells(2, 1, 2, lastColumn)
  subtitleRow.height = 18
  subtitleRow.getCell(1).font = { size: 10, italic: true, color: { argb: XLSX_SECONDARY } }
  subtitleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
}

function addHeaderRow(sheet: ExcelJS.Worksheet, headers: string[]) {
  const headerRow = sheet.addRow(headers)
  headerRow.height = 22
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_ACCENT } }
    cell.font = { bold: true, size: 11, color: { argb: XLSX_CREAM } }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
    cell.border = { bottom: { style: 'medium', color: { argb: XLSX_PRIMARY } } }
  })
}

function addDataRows(
  sheet: ExcelJS.Worksheet,
  rows: (string | number)[][],
  moneyColumns: number[] = [],
) {
  rows.forEach((row, index) => {
    const dataRow = sheet.addRow(row)
    if (index % 2 === 1) {
      dataRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XLSX_ROW_ALT } }
      })
    }
    for (const column of moneyColumns) {
      dataRow.getCell(column).numFmt = '#,##0.00'
    }
  })
}

/**
 * Monta o relatório já estilizado com as cores do painel, 1 aba por seção — mesmo padrão visual
 * de buildProductsWorkbook.ts. "Resumo" traz os KPIs, as outras 3 são as tabelas de ranking que já
 * existem na tela (Produtos/Canais/Atendentes), uma por aba pra dar pra filtrar/ordenar cada uma
 * sem misturar com as outras.
 */
export async function buildReportWorkbook(
  summary: ReportSummary,
  avgPrepTimeMinutes: number | null | undefined,
  newVsReturning: NewVsReturningCount | undefined,
  storeName: string,
  period: keyof typeof PERIOD_LABEL,
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Splash Pedidos'
  workbook.created = new Date()

  const exportedAt = `Exportado em ${new Date().toLocaleDateString('pt-BR')} · ${storeName} · Período: ${PERIOD_LABEL[period]}`

  // ---- Resumo ----
  const resumoSheet = workbook.addWorksheet('Resumo', { views: [{ state: 'frozen', ySplit: 3 }] })
  resumoSheet.columns = [{ width: 30 }, { width: 20 }]
  addTitleBlock(resumoSheet, `Relatório — ${storeName}`, exportedAt, 2)
  addHeaderRow(resumoSheet, ['Métrica', 'Valor'])
  const cancellationRate =
    summary.orderCount + summary.cancelledCount > 0
      ? `${((summary.cancelledCount / (summary.orderCount + summary.cancelledCount)) * 100).toFixed(1)}%`
      : '—'
  const resumoRows: (string | number)[][] = [
    ['Faturamento', summary.totalRevenue],
    ['Pedidos', summary.orderCount],
    ['Ticket médio', summary.averageTicket],
    ['Taxa de cancelamento', cancellationRate],
    ['Cancelados', summary.cancelledCount],
    ['Tempo médio de preparo (min)', avgPrepTimeMinutes != null ? Math.round(avgPrepTimeMinutes) : '—'],
  ]
  if (newVsReturning) {
    resumoRows.push(['Clientes novos', newVsReturning.newCustomers])
    resumoRows.push(['Clientes recorrentes', newVsReturning.returningCustomers])
  }
  addDataRows(resumoSheet, resumoRows, [2])

  // ---- Produtos ----
  const produtosSheet = workbook.addWorksheet('Produtos', { views: [{ state: 'frozen', ySplit: 3 }] })
  produtosSheet.columns = [{ width: 8 }, { width: 40 }, { width: 18 }]
  addTitleBlock(produtosSheet, 'Produtos mais vendidos', exportedAt, 3)
  addHeaderRow(produtosSheet, ['#', 'Produto', 'Quantidade vendida'])
  addDataRows(
    produtosSheet,
    summary.topProducts.map((product, index) => [index + 1, product.productName, product.quantitySold]),
  )
  produtosSheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: 3 } }

  // ---- Canais ----
  const canaisSheet = workbook.addWorksheet('Canais', { views: [{ state: 'frozen', ySplit: 3 }] })
  canaisSheet.columns = [{ width: 22 }, { width: 12 }, { width: 16 }, { width: 16 }]
  addTitleBlock(canaisSheet, 'Canais de venda', exportedAt, 4)
  addHeaderRow(canaisSheet, ['Canal', 'Pedidos', 'Faturamento', 'Ticket médio'])
  addDataRows(
    canaisSheet,
    summary.channelBreakdown.map((channel) => [
      channel.label,
      channel.orderCount,
      channel.revenue,
      channel.averageTicket,
    ]),
    [3, 4],
  )
  canaisSheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: 4 } }

  // ---- Atendentes ----
  const atendentesSheet = workbook.addWorksheet('Atendentes', { views: [{ state: 'frozen', ySplit: 3 }] })
  atendentesSheet.columns = [{ width: 8 }, { width: 28 }, { width: 12 }, { width: 16 }]
  addTitleBlock(atendentesSheet, 'Ranking de atendente', exportedAt, 4)
  addHeaderRow(atendentesSheet, ['#', 'Atendente', 'Pedidos', 'Faturamento'])
  addDataRows(
    atendentesSheet,
    summary.attendantRanking.map((attendant, index) => [
      index + 1,
      attendant.attendantName,
      attendant.orderCount,
      attendant.revenue,
    ]),
    [4],
  )
  atendentesSheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: 4 } }

  return workbook.xlsx.writeBuffer()
}
