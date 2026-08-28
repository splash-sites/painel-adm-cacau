import { describe, expect, it } from 'vitest'
import { buildProductsWorkbook } from './buildProductsWorkbook'
import { XlsxSpreadsheetParser } from '../import/XlsxSpreadsheetParser'
import { parseProductImportRow } from '../../../domain/product/import/parseProductImportRow'
import type { Product } from '../../../domain/product/Product'

const product: Product = {
  id: 'p1',
  storeId: 's1',
  externalCode: 'CAF001',
  name: 'Café Coado 200ml',
  ncm: '09011110',
  unit: 'UN',
  category: 'Bebidas',
  categoryId: 'c1',
  categoryName: 'Bebidas',
  description: 'Coado na hora, grãos selecionados',
  imageUrl: null,
  trackStock: true,
  stockQuantity: 50,
  costPrice: 2.3,
  price: 7,
  loverPrice: 6,
  sortOrder: 3,
  active: false,
  availableDineIn: true,
  availablePickup: false,
  availableDelivery: false,
  availableReseller: true,
}

async function parse(buffer: ArrayBuffer) {
  return new XlsxSpreadsheetParser().parseFile(new File([buffer], 'export.xlsx'))
}

describe('buildProductsWorkbook', () => {
  it('with no products, writes only the header the importer recognizes', async () => {
    const buffer = await buildProductsWorkbook([], 'Loja Vazia')
    const rows = await parse(buffer)
    expect(rows).toEqual([])
  })

  it('round-trips a product back through the import parser', async () => {
    const buffer = await buildProductsWorkbook([product], 'Loja Teste')
    const rows = await parse(buffer)
    expect(rows).toHaveLength(1)

    expect(parseProductImportRow(rows[0])).toMatchObject({
      externalCode: 'CAF001',
      name: 'Café Coado 200ml',
      description: 'Coado na hora, grãos selecionados',
      categoryName: 'Bebidas',
      ncm: '09011110',
      unit: 'UN',
      trackStock: true,
      stockQuantity: 50,
      costPrice: 2.3,
      price: 7,
      loverPrice: 6,
      sortOrder: 3,
      active: false,
      availableDineIn: true,
      availablePickup: false,
      availableReseller: true,
    })
  })

  it('writes stock 0 / "não" for a product that does not track stock', async () => {
    const buffer = await buildProductsWorkbook([{ ...product, trackStock: false, stockQuantity: 99 }], 'L')
    const parsed = parseProductImportRow((await parse(buffer))[0])
    expect(parsed?.trackStock).toBe(false)
    expect(parsed?.stockQuantity).toBe(0)
  })

  it('falls back to the free-text category when there is no linked category name', async () => {
    const buffer = await buildProductsWorkbook(
      [{ ...product, categoryName: null, category: 'Doces' }],
      'L',
    )
    const parsed = parseProductImportRow((await parse(buffer))[0])
    expect(parsed?.categoryName).toBe('Doces')
  })
})
