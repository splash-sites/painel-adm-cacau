import { describe, expect, it } from 'vitest'
import { parseProductImportRow } from './parseProductImportRow'

describe('parseProductImportRow', () => {
  it('parses a well-formed row using PT-BR headers', () => {
    const row = parseProductImportRow({
      Codigo: 'ABC123',
      Descricao: 'Bombom de cacau',
      NCM: '1806.32.20',
      Unidade: 'UN',
      Estoque: '10',
      'Custo R$': '2,50',
      'Preco R$': '5,90',
      Ordem: '3',
    })

    expect(row).toEqual({
      externalCode: 'ABC123',
      name: 'Bombom de cacau',
      ncm: '1806.32.20',
      unit: 'UN',
      stockQuantity: 10,
      costPrice: 2.5,
      price: 5.9,
      sortOrder: 3,
    })
  })

  it('matches headers regardless of accents/case', () => {
    const row = parseProductImportRow({
      CÓDIGO: 'X1',
      DESCRIÇÃO: 'Produto',
      'PREÇO R$': '10',
    })

    expect(row?.externalCode).toBe('X1')
    expect(row?.name).toBe('Produto')
    expect(row?.price).toBe(10)
  })

  it('returns null when code is missing', () => {
    expect(parseProductImportRow({ Descricao: 'Produto sem codigo' })).toBeNull()
  })

  it('returns null when name is missing', () => {
    expect(parseProductImportRow({ Codigo: 'X1' })).toBeNull()
  })

  it('defaults missing numeric fields to 0 or null', () => {
    const row = parseProductImportRow({ Codigo: 'X1', Descricao: 'Produto' })
    expect(row).toEqual({
      externalCode: 'X1',
      name: 'Produto',
      ncm: null,
      unit: null,
      stockQuantity: 0,
      costPrice: null,
      price: 0,
      sortOrder: 0,
    })
  })

  it('parses thousands-separated currency values', () => {
    const row = parseProductImportRow({ Codigo: 'X1', Descricao: 'Produto', 'Preco R$': '1.234,56' })
    expect(row?.price).toBe(1234.56)
  })
})
