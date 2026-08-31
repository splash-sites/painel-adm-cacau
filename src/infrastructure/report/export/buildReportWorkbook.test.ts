import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { buildReportWorkbook } from './buildReportWorkbook'
import type { ReportSummary } from '../../../domain/report/ReportSummary'

const summary: ReportSummary = {
  orderCount: 10,
  totalRevenue: 350.5,
  averageTicket: 35.05,
  cancelledCount: 2,
  topProducts: [
    { productId: 'p1', productName: 'Fondue', quantitySold: 6 },
    { productId: 'p2', productName: 'Água', quantitySold: 4 },
  ],
  channelBreakdown: [
    { label: 'Cafeteria', orderCount: 7, revenue: 250.5, averageTicket: 35.78 },
    { label: 'Delivery', orderCount: 3, revenue: 100, averageTicket: 33.33 },
  ],
  attendantRanking: [{ attendantId: 'a1', attendantName: 'Julia', orderCount: 10, revenue: 350.5 }],
}

async function loadWorkbook(buffer: ArrayBuffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  return workbook
}

describe('buildReportWorkbook', () => {
  it('writes 1 aba por seção, todas presentes mesmo sem dado', async () => {
    const empty: ReportSummary = { ...summary, topProducts: [], channelBreakdown: [], attendantRanking: [] }
    const buffer = await buildReportWorkbook(empty, null, undefined, 'Loja Vazia', 'today')
    const workbook = await loadWorkbook(buffer)

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Resumo', 'Produtos', 'Canais', 'Atendentes'])
    // sem produto/canal/atendente, só sobra o cabeçalho (linha 3) em cada aba
    expect(workbook.getWorksheet('Produtos')!.rowCount).toBe(3)
    expect(workbook.getWorksheet('Canais')!.rowCount).toBe(3)
    expect(workbook.getWorksheet('Atendentes')!.rowCount).toBe(3)
  })

  it('aba Resumo traz os KPIs certos, incluindo taxa de cancelamento calculada', async () => {
    const buffer = await buildReportWorkbook(summary, 12.4, { newCustomers: 3, returningCustomers: 7 }, 'Loja', '7d')
    const workbook = await loadWorkbook(buffer)
    const sheet = workbook.getWorksheet('Resumo')!

    const rows = new Map<string, unknown>()
    for (let i = 4; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i)
      rows.set(String(row.getCell(1).value), row.getCell(2).value)
    }

    expect(rows.get('Faturamento')).toBe(350.5)
    expect(rows.get('Pedidos')).toBe(10)
    expect(rows.get('Ticket médio')).toBe(35.05)
    // cancelledCount=2, orderCount=10 -> 2/12 = 16.7%
    expect(rows.get('Taxa de cancelamento')).toBe('16.7%')
    expect(rows.get('Cancelados')).toBe(2)
    expect(rows.get('Tempo médio de preparo (min)')).toBe(12)
    expect(rows.get('Clientes novos')).toBe(3)
    expect(rows.get('Clientes recorrentes')).toBe(7)
  })

  it('aba Produtos lista o ranking na mesma ordem recebida, numerado', async () => {
    const buffer = await buildReportWorkbook(summary, null, undefined, 'Loja', 'today')
    const workbook = await loadWorkbook(buffer)
    const sheet = workbook.getWorksheet('Produtos')!

    expect(sheet.getRow(4).values).toEqual([undefined, 1, 'Fondue', 6])
    expect(sheet.getRow(5).values).toEqual([undefined, 2, 'Água', 4])
  })

  it('aba Canais traz pedidos/faturamento/ticket médio por canal', async () => {
    const buffer = await buildReportWorkbook(summary, null, undefined, 'Loja', 'today')
    const workbook = await loadWorkbook(buffer)
    const sheet = workbook.getWorksheet('Canais')!

    expect(sheet.getRow(4).values).toEqual([undefined, 'Cafeteria', 7, 250.5, 35.78])
    expect(sheet.getRow(5).values).toEqual([undefined, 'Delivery', 3, 100, 33.33])
  })

  it('aba Atendentes traz o ranking com faturamento', async () => {
    const buffer = await buildReportWorkbook(summary, null, undefined, 'Loja', 'today')
    const workbook = await loadWorkbook(buffer)
    const sheet = workbook.getWorksheet('Atendentes')!

    expect(sheet.getRow(4).values).toEqual([undefined, 1, 'Julia', 10, 350.5])
  })

  it('sem tempo médio de preparo nem novos/recorrentes, mostra "—" e omite as linhas de cliente', async () => {
    const buffer = await buildReportWorkbook(summary, null, undefined, 'Loja', 'today')
    const workbook = await loadWorkbook(buffer)
    const sheet = workbook.getWorksheet('Resumo')!

    const rows = new Map<string, unknown>()
    for (let i = 4; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i)
      rows.set(String(row.getCell(1).value), row.getCell(2).value)
    }

    expect(rows.get('Tempo médio de preparo (min)')).toBe('—')
    expect(rows.has('Clientes novos')).toBe(false)
  })
})
