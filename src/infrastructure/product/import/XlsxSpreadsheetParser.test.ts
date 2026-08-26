import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { XlsxSpreadsheetParser } from './XlsxSpreadsheetParser'

async function makeXlsxFile(rows: unknown[][]): Promise<File> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Planilha1')
  rows.forEach((row) => sheet.addRow(row))
  const buffer = await workbook.xlsx.writeBuffer()
  return new File([buffer], 'planilha.xlsx')
}

function makeCsvFile(content: string, name = 'planilha.csv'): File {
  return new File([content], name, { type: 'text/csv' })
}

describe('XlsxSpreadsheetParser', () => {
  it('lança erro explícito quando não acha coluna Código (xlsx)', async () => {
    const file = await makeXlsxFile([
      ['Descrição', 'Estoque'],
      ['Produto X', 10],
    ])
    const parser = new XlsxSpreadsheetParser()
    await expect(parser.parseFile(file)).rejects.toThrow(/Código/)
  })

  it('parseia normal quando acha a coluna Código (xlsx)', async () => {
    const file = await makeXlsxFile([
      ['Código', 'Descrição', 'Estoque'],
      ['1', 'Produto X', 10],
    ])
    const parser = new XlsxSpreadsheetParser()
    const rows = await parser.parseFile(file)
    expect(rows).toEqual([{ Código: '1', Descrição: 'Produto X', Estoque: 10 }])
  })

  it('parseia CSV com delimitador vírgula', async () => {
    const file = makeCsvFile('Código,Descrição,Estoque\n1,Produto X,10\n2,Produto Y,5')
    const parser = new XlsxSpreadsheetParser()
    const rows = await parser.parseFile(file)
    expect(rows).toEqual([
      { Código: '1', Descrição: 'Produto X', Estoque: '10' },
      { Código: '2', Descrição: 'Produto Y', Estoque: '5' },
    ])
  })

  it('parseia CSV com delimitador ponto-e-vírgula (Excel pt-BR)', async () => {
    const file = makeCsvFile('Código;Descrição;Estoque\n1;Produto X;10')
    const parser = new XlsxSpreadsheetParser()
    const rows = await parser.parseFile(file)
    expect(rows).toEqual([{ Código: '1', Descrição: 'Produto X', Estoque: '10' }])
  })

  it('parseia CSV com campo entre aspas contendo o delimitador', async () => {
    const file = makeCsvFile('Código,Descrição,Estoque\n1,"Produto, especial",10')
    const parser = new XlsxSpreadsheetParser()
    const rows = await parser.parseFile(file)
    expect(rows).toEqual([{ Código: '1', Descrição: 'Produto, especial', Estoque: '10' }])
  })

  it('rejeita .xls antigo com mensagem explícita, não trava silencioso', async () => {
    const file = new File([new Uint8Array([0xd0, 0xcf, 0x11, 0xe0])], 'planilha.xls')
    const parser = new XlsxSpreadsheetParser()
    await expect(parser.parseFile(file)).rejects.toThrow(/\.xls antigo/)
  })
})
