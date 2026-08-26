import ExcelJS from 'exceljs'
import type { SpreadsheetParser } from '../../../application/product/import/SpreadsheetParser'

const DIACRITICS_PATTERN = /[̀-ͯ]/g

function normalize(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(DIACRITICS_PATTERN, '')
    .trim()
    .toLowerCase()
}

/** Achata os tipos especiais de célula do ExcelJS (fórmula, texto rico) pro valor plano equivalente. */
function cellToPlainValue(value: ExcelJS.CellValue): unknown {
  if (value == null || value instanceof Date) return value
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((run) => run.text).join('')
    if ('result' in value) return value.result ?? null
    if ('text' in value) return value.text
  }
  return value
}

/** Conta ocorrências de `,` vs `;` na 1ª linha não-vazia pra decidir o delimitador — Excel em
 * pt-BR costuma exportar CSV com `;` (vírgula é separador decimal nesse locale). */
function detectCsvDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim() !== '') ?? ''
  const commaCount = (firstLine.match(/,/g) ?? []).length
  const semicolonCount = (firstLine.match(/;/g) ?? []).length
  return semicolonCount > commaCount ? ';' : ','
}

/** Parser CSV mínimo com suporte a campo entre aspas (vírgula/quebra de linha dentro do campo, `""` como aspas escapada). */
function parseCsv(text: string, delimiter: string): unknown[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

async function readCsvRows(file: File): Promise<unknown[][]> {
  const text = await file.text()
  return parseCsv(text, detectCsvDelimiter(text))
}

async function readXlsxRows(file: File): Promise<unknown[][]> {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(buffer)
  } catch {
    throw new Error(
      'Não foi possível abrir esse arquivo. Formato .xls antigo (Excel 97-2003) não é suportado — salve como .xlsx ou .csv e importe de novo.',
    )
  }
  const sheet = workbook.worksheets[0]
  const rows: unknown[][] = []
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const values = row.values as ExcelJS.CellValue[]
    rows.push(values.slice(1).map(cellToPlainValue))
  })
  return rows
}

/**
 * Procura a linha do cabeçalho pela célula "Código" em vez de assumir que é a
 * primeira linha — planilhas reais de ERP costumam ter título/linha em branco antes.
 */
export class XlsxSpreadsheetParser implements SpreadsheetParser {
  async parseFile(file: File): Promise<Record<string, unknown>[]> {
    const rawRows = file.name.toLowerCase().endsWith('.csv') ? await readCsvRows(file) : await readXlsxRows(file)

    const headerRowIndex = rawRows.findIndex((row) => row.some((cell) => normalize(cell) === 'codigo'))
    if (headerRowIndex === -1) {
      throw new Error('Coluna "Código" não encontrada na planilha. Confira se o arquivo é o formato certo.')
    }

    const headers = rawRows[headerRowIndex].map((cell) => String(cell ?? '').trim())
    const dataRows = rawRows.slice(headerRowIndex + 1)

    return dataRows
      .filter((row) => row.some((cell) => cell !== null && cell !== undefined && cell !== ''))
      .map((row) => {
        const record: Record<string, unknown> = {}
        headers.forEach((header, index) => {
          if (header) record[header] = row[index] ?? null
        })
        return record
      })
  }
}
