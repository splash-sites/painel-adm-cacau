import { describe, expect, it } from 'vitest'
import { parseProductImportRow } from './parseProductImportRow'

describe('parseProductImportRow', () => {
  it('parses a well-formed row using PT-BR headers', () => {
    const row = parseProductImportRow({
      Codigo: 'ABC123',
      Descricao: 'Bombom de cacau',
      'Descrição detalhada': 'Bombom recheado com ganache',
      Categoria: 'Doces',
      NCM: '1806.32.20',
      Unidade: 'UN',
      Estoque: '10',
      'Custo R$': '2,50',
      'Preco R$': '5,90',
      'Lover R$': '4,90',
      'Utilizara estoque': 'sim',
      Ativo: 'sim',
      Cafeteria: 'sim',
      'Para levar/entrega': 'sim',
      Revendedor: 'não',
      Ordem: '3',
    })

    expect(row).toEqual({
      externalCode: 'ABC123',
      name: 'Bombom de cacau',
      description: 'Bombom recheado com ganache',
      categoryName: 'Doces',
      ncm: '1806.32.20',
      unit: 'UN',
      trackStock: true,
      stockQuantity: 10,
      costPrice: 2.5,
      price: 5.9,
      loverPrice: 4.9,
      sortOrder: 3,
      active: true,
      availableDineIn: true,
      availablePickup: true,
      availableReseller: false,
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

  it('leaves every optional field null when only code + name are present (nothing informed)', () => {
    const row = parseProductImportRow({ Codigo: 'X1', Descricao: 'Produto' })
    expect(row).toEqual({
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
    })
  })

  it('parses thousands-separated currency values', () => {
    const row = parseProductImportRow({ Codigo: 'X1', Descricao: 'Produto', 'Preco R$': '1.234,56' })
    expect(row?.price).toBe(1234.56)
  })

  it('forces stock quantity to 0 when "Utilizará estoque" is "não", even with a value in Estoque', () => {
    const row = parseProductImportRow({
      Codigo: 'X1',
      Descricao: 'Produto',
      Estoque: '50',
      'Utilizara estoque': 'não',
    })
    expect(row?.trackStock).toBe(false)
    expect(row?.stockQuantity).toBe(0)
  })

  it('reads the channel columns literally (null when the cell is blank)', () => {
    const row = parseProductImportRow({
      Codigo: 'X1',
      Descricao: 'Produto',
      Cafeteria: 'não',
      Revendedor: 'sim',
      // "Para levar/entrega" ausente -> null (não informado)
    })
    expect(row?.availableDineIn).toBe(false)
    expect(row?.availablePickup).toBe(null)
    expect(row?.availableReseller).toBe(true)
  })

  it('captures the raw category name for later resolution', () => {
    const row = parseProductImportRow({ Codigo: 'X1', Descricao: 'Produto', Categoria: '  Bebidas  ' })
    expect(row?.categoryName).toBe('Bebidas')
  })

  it('reads "Ativo" accepting sim/não and ativo/inativo', () => {
    expect(parseProductImportRow({ Codigo: 'X1', Descricao: 'P', Ativo: 'não' })?.active).toBe(false)
    expect(parseProductImportRow({ Codigo: 'X1', Descricao: 'P', Ativo: 'Inativo' })?.active).toBe(false)
    expect(parseProductImportRow({ Codigo: 'X1', Descricao: 'P', Ativo: 'sim' })?.active).toBe(true)
    expect(parseProductImportRow({ Codigo: 'X1', Descricao: 'P' })?.active).toBe(null)
  })
})
