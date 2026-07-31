import * as XLSX from 'xlsx'
import type { SpreadsheetParser } from '../../../application/product/import/SpreadsheetParser'

const DIACRITICS_PATTERN = /[̀-ͯ]/g

function normalize(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(DIACRITICS_PATTERN, '')
    .trim()
    .toLowerCase()
}

/**
 * Procura a linha do cabeçalho pela célula "Código" em vez de assumir que é a
 * primeira linha — planilhas reais de ERP costumam ter título/linha em branco antes.
 */
export class XlsxSpreadsheetParser implements SpreadsheetParser {
  async parseFile(file: File): Promise<Record<string, unknown>[]> {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[firstSheetName]

    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null })

    const headerRowIndex = rawRows.findIndex((row) => row.some((cell) => normalize(cell) === 'codigo'))
    if (headerRowIndex === -1) {
      throw new Error('Coluna "Código" não encontrada na planilha. Confira se o arquivo é o formato certo.')
    }

    const headers = rawRows[headerRowIndex].map((cell) => String(cell ?? '').trim())
    const dataRows = rawRows.slice(headerRowIndex + 1)

    return dataRows
      .filter((row) => row.some((cell) => cell !== null && cell !== ''))
      .map((row) => {
        const record: Record<string, unknown> = {}
        headers.forEach((header, index) => {
          if (header) record[header] = row[index] ?? null
        })
        return record
      })
  }
}
