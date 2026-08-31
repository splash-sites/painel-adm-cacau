import ExcelJS from 'exceljs'
import type { Product } from '../../../domain/product/Product'

/**
 * Colunas iguais às que a importação lê (`parseProductImportRow`) — o arquivo exportado
 * pode ser editado e reimportado sem ajuste. A ordem aqui é só cosmética; o import casa
 * pelo nome do cabeçalho.
 */
const HEADERS = [
  'Código',
  'Descrição',
  'Descrição detalhada',
  'Categoria',
  'NCM',
  'Unidade',
  'Estoque',
  'Utilizará estoque',
  'Custo R$',
  'Preço R$',
  'Lover R$',
  'Cafeteria',
  'Para levar/entrega',
  'Revendedor',
  'Ativo',
] as const

const COLUMN_WIDTH = [14, 34, 42, 20, 14, 10, 10, 16, 12, 12, 12, 12, 18, 13, 10]

// Paleta do painel (CLAUDE.md) em ARGB pro ExcelJS.
const ACCENT = 'FF2C120B'
const CREAM = 'FFF0ECD2'
const PRIMARY = 'FFCF9047'
const SECONDARY = 'FF7B431B'
const ROW_ALT = 'FFF7F3E3'
const MONEY_COLUMNS = [9, 10, 11]

function yesNo(value: boolean): string {
  return value ? 'sim' : 'não'
}

function productToRow(product: Product): (string | number)[] {
  return [
    product.externalCode,
    product.name,
    product.description ?? '',
    product.categoryName ?? product.category ?? '',
    product.ncm ?? '',
    product.unit ?? '',
    product.trackStock ? product.stockQuantity : 0,
    yesNo(product.trackStock),
    product.costPrice ?? '',
    product.price,
    product.loverPrice,
    yesNo(product.availableDineIn),
    yesNo(product.availablePickup),
    yesNo(product.availableReseller),
    yesNo(product.active),
  ]
}

/**
 * Monta a planilha de produtos já estilizada com as cores do painel.
 * Linhas 1-2: título (nome da loja) + resumo. Linha 3: cabeçalho (congelado).
 * Linha 4+: produtos. Sem produto, sai só até o cabeçalho.
 * A importação acha o cabeçalho pela célula "Código", então as linhas de título não atrapalham.
 */
export async function buildProductsWorkbook(products: Product[], storeName: string): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Splash Pedidos'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Produtos', {
    views: [{ state: 'frozen', ySplit: 3 }],
  })
  sheet.columns = COLUMN_WIDTH.map((width) => ({ width }))

  const lastColumn = HEADERS.length

  const titleRow = sheet.addRow([`Produtos — ${storeName}`])
  sheet.mergeCells(1, 1, 1, lastColumn)
  titleRow.height = 28
  titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } }
  titleRow.getCell(1).font = { size: 15, bold: true, color: { argb: CREAM } }
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

  const summaryRow = sheet.addRow([
    `Exportado em ${new Date().toLocaleDateString('pt-BR')} · ${products.length} produto${products.length === 1 ? '' : 's'}`,
  ])
  sheet.mergeCells(2, 1, 2, lastColumn)
  summaryRow.height = 18
  summaryRow.getCell(1).font = { size: 10, italic: true, color: { argb: SECONDARY } }
  summaryRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

  const headerRow = sheet.addRow([...HEADERS])
  headerRow.height = 22
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } }
    cell.font = { bold: true, size: 11, color: { argb: CREAM } }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
    cell.border = { bottom: { style: 'medium', color: { argb: PRIMARY } } }
  })

  products.forEach((product, index) => {
    const row = sheet.addRow(productToRow(product))
    if (index % 2 === 1) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT } }
      })
    }
    for (const column of MONEY_COLUMNS) {
      row.getCell(column).numFmt = '#,##0.00'
    }
  })

  sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: lastColumn } }

  return workbook.xlsx.writeBuffer()
}
