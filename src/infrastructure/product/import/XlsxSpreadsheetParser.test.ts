import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { XlsxSpreadsheetParser } from './XlsxSpreadsheetParser'

function makeFile(rows: unknown[][]): File {
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Planilha1')
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  return new File([buffer], 'planilha.xlsx')
}

describe('XlsxSpreadsheetParser', () => {
  it('lança erro explícito quando não acha coluna Código', async () => {
    const file = makeFile([
      ['Descrição', 'Estoque'],
      ['Produto X', 10],
    ])
    const parser = new XlsxSpreadsheetParser()
    await expect(parser.parseFile(file)).rejects.toThrow(/Código/)
  })

  it('parseia normal quando acha a coluna Código', async () => {
    const file = makeFile([
      ['Código', 'Descrição', 'Estoque'],
      ['1', 'Produto X', 10],
    ])
    const parser = new XlsxSpreadsheetParser()
    const rows = await parser.parseFile(file)
    expect(rows).toEqual([{ Código: '1', Descrição: 'Produto X', Estoque: 10 }])
  })
})
