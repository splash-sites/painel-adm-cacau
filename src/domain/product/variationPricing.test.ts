import { describe, expect, it } from 'vitest'
import { applyVariationsToUnitPrice, isValidVariationSelection } from './variationPricing'

describe('applyVariationsToUnitPrice', () => {
  it('returns unitPrice unchanged with no variations selected', () => {
    expect(applyVariationsToUnitPrice(8, [])).toBe(8)
  })

  it('additive: sums the price delta on top of unitPrice (0 = neutro, ex: intensidade)', () => {
    // Sabor: Chocolate especial (+R$2, additive) + Fruta: Morango (+R$0, additive)
    expect(
      applyVariationsToUnitPrice(8, [
        { price: 2, priceMode: 'additive' },
        { price: 0, priceMode: 'additive' },
      ]),
    ).toBe(10)
  })

  it('replace: overrides unitPrice entirely instead of adding — Capuccino R$8 + Grande (replace, R$15) = R$15', () => {
    expect(applyVariationsToUnitPrice(8, [{ price: 15, priceMode: 'replace' }])).toBe(15)
  })

  it('replace + additive together: additive still adds on top of the replaced base', () => {
    expect(
      applyVariationsToUnitPrice(8, [
        { price: 15, priceMode: 'replace' },
        { price: 2, priceMode: 'additive' },
      ]),
    ).toBe(17)
  })

  it('2 replace selections at once: sums them instead of picking one (rare edge case)', () => {
    expect(
      applyVariationsToUnitPrice(8, [
        { price: 15, priceMode: 'replace' },
        { price: 5, priceMode: 'replace' },
      ]),
    ).toBe(20)
  })
})

describe('isValidVariationSelection', () => {
  const groups = [{ variationGroupId: 'sabor' }, { variationGroupId: 'fruta' }]

  it('rejects when a required group has no selection', () => {
    expect(isValidVariationSelection(groups, [{ variationGroupId: 'sabor' }])).toBe(false)
  })

  it('accepts exactly 1 selection per required group', () => {
    expect(
      isValidVariationSelection(groups, [{ variationGroupId: 'sabor' }, { variationGroupId: 'fruta' }]),
    ).toBe(true)
  })

  it('rejects a selection for a group not linked to the product', () => {
    expect(
      isValidVariationSelection([{ variationGroupId: 'sabor' }], [
        { variationGroupId: 'sabor' },
        { variationGroupId: 'tamanho' },
      ]),
    ).toBe(false)
  })

  it('rejects 2 selections for the same group (single-select only)', () => {
    expect(
      isValidVariationSelection([{ variationGroupId: 'sabor' }], [
        { variationGroupId: 'sabor' },
        { variationGroupId: 'sabor' },
      ]),
    ).toBe(false)
  })

  it('accepts empty/empty when the product has no variation groups linked', () => {
    expect(isValidVariationSelection([], [])).toBe(true)
  })
})
