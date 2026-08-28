import { describe, expect, it } from 'vitest'
import { resolveImportValues } from './resolveImportValues'
import type { ProductImportRow, ProductImportValues } from './ProductImportRow'

const blankRow: ProductImportRow = {
  externalCode: 'X1',
  name: 'Produto',
  description: null,
  categoryName: null,
  ncm: null,
  unit: null,
  trackStock: null,
  stockQuantity: null,
  costPrice: null,
  price: null,
  loverPrice: null,
  sortOrder: null,
  active: null,
  availableDineIn: null,
  availablePickup: null,
  availableReseller: null,
}

const existing: ProductImportValues = {
  description: 'Descrição cadastrada à mão',
  categoryName: 'Bebidas',
  ncm: '1234',
  unit: 'UN',
  trackStock: true,
  stockQuantity: 42,
  costPrice: 3.5,
  price: 9,
  loverPrice: 7,
  sortOrder: 5,
  active: false,
  availableDineIn: true,
  availablePickup: false,
  availableReseller: true,
}

describe('resolveImportValues', () => {
  it('applies neutral defaults when creating (no existing product)', () => {
    expect(resolveImportValues(blankRow, null)).toEqual({
      description: null,
      categoryName: null,
      ncm: null,
      unit: null,
      trackStock: true,
      stockQuantity: 0,
      costPrice: null,
      price: 0,
      loverPrice: 0,
      sortOrder: 0,
      active: true,
      availableDineIn: true,
      availablePickup: true,
      availableReseller: false,
    })
  })

  it('keeps every existing value when the row leaves the cell blank (update)', () => {
    expect(resolveImportValues(blankRow, existing)).toEqual(existing)
  })

  it('resolves "Ativo": blank keeps existing on update, defaults to true on create, filled overrides', () => {
    expect(resolveImportValues(blankRow, null).active).toBe(true)
    expect(resolveImportValues(blankRow, existing).active).toBe(false) // mantém o inativo atual
    expect(resolveImportValues({ ...blankRow, active: true }, existing).active).toBe(true)
  })

  it('lets a filled cell override the existing value', () => {
    const row: ProductImportRow = { ...blankRow, price: 12.5, description: 'novo texto', availablePickup: true }
    const resolved = resolveImportValues(row, existing)
    expect(resolved.price).toBe(12.5)
    expect(resolved.description).toBe('novo texto')
    expect(resolved.availablePickup).toBe(true)
    // não tocadas seguem do existing
    expect(resolved.ncm).toBe('1234')
    expect(resolved.loverPrice).toBe(7)
  })

  it('forces stock to 0 when tracking resolves to false', () => {
    const row: ProductImportRow = { ...blankRow, trackStock: false, stockQuantity: 99 }
    expect(resolveImportValues(row, existing).stockQuantity).toBe(0)
  })

  it('falls back lover price to the resolved price only when creating', () => {
    const row: ProductImportRow = { ...blankRow, price: 20 }
    expect(resolveImportValues(row, null).loverPrice).toBe(20)
    // no update, lover em branco mantém o lover atual, não vira o preço novo
    expect(resolveImportValues(row, existing).loverPrice).toBe(7)
  })
})
