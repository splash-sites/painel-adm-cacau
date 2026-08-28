import { describe, expect, it } from 'vitest'
import { buildImportPreview } from './buildImportPreview'
import type { ProductImportValues } from './ProductImportRow'

function existingValues(overrides: Partial<ProductImportValues> = {}): ProductImportValues {
  return {
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
    ...overrides,
  }
}

describe('buildImportPreview', () => {
  it('marks rows as create or update based on the merge snapshot', () => {
    const preview = buildImportPreview(
      [
        { Codigo: 'NEW1', Descricao: 'Produto novo' },
        { Codigo: 'OLD1', Descricao: 'Produto existente' },
      ],
      new Map([['OLD1', existingValues()]]),
      new Set(),
    )

    expect(preview.rows).toEqual([
      expect.objectContaining({ externalCode: 'NEW1', action: 'create' }),
      expect.objectContaining({ externalCode: 'OLD1', action: 'update' }),
    ])
    expect(preview.skippedCount).toBe(0)
    expect(preview.duplicateCount).toBe(0)
  })

  it('counts unparsable rows as skipped', () => {
    const preview = buildImportPreview([{ Descricao: 'Sem codigo' }, {}], new Map(), new Set())
    expect(preview.rows).toHaveLength(0)
    expect(preview.skippedCount).toBe(2)
  })

  it('deduplicates repeated codes keeping the last occurrence', () => {
    const preview = buildImportPreview(
      [
        { Codigo: 'DUP', Descricao: 'Primeira versão', Estoque: '1' },
        { Codigo: 'DUP', Descricao: 'Segunda versão', Estoque: '2' },
      ],
      new Map(),
      new Set(),
    )

    expect(preview.duplicateCount).toBe(1)
    expect(preview.rows).toHaveLength(1)
    expect(preview.rows[0].name).toBe('Segunda versão')
    expect(preview.rows[0].resolved.stockQuantity).toBe(2)
  })

  it('keeps the existing value for a blank cell on update', () => {
    const preview = buildImportPreview(
      [{ Codigo: 'OLD1', Descricao: 'Produto', 'Preco R$': '15' }],
      new Map([['OLD1', existingValues({ description: 'texto antigo', price: 9, ncm: '999' })]]),
      new Set(),
    )

    const resolved = preview.rows[0].resolved
    expect(resolved.price).toBe(15) // veio na planilha -> troca
    expect(resolved.description).toBe('texto antigo') // célula vazia -> mantém
    expect(resolved.ncm).toBe('999')
  })

  it('lists category names not yet in the store, de-duplicated and case-insensitive', () => {
    const preview = buildImportPreview(
      [
        { Codigo: 'A', Descricao: 'a', Categoria: 'Bebidas' },
        { Codigo: 'B', Descricao: 'b', Categoria: 'bebidas' },
        { Codigo: 'C', Descricao: 'c', Categoria: 'Doces' },
        { Codigo: 'D', Descricao: 'd', Categoria: 'Salgados' },
      ],
      new Map(),
      new Set(['Salgados']),
    )

    expect(preview.newCategoryNames).toEqual(['Bebidas', 'Doces'])
  })

  it('does not flag a kept category (blank cell on update) as new', () => {
    const preview = buildImportPreview(
      [{ Codigo: 'OLD1', Descricao: 'Produto' }],
      new Map([['OLD1', existingValues({ categoryName: 'Bebidas' })]]),
      new Set(['Bebidas']),
    )
    expect(preview.newCategoryNames).toEqual([])
    expect(preview.rows[0].resolved.categoryName).toBe('Bebidas')
  })
})
