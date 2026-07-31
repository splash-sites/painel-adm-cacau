import { describe, expect, it } from 'vitest'
import { calculateItemTotal, isValidAddonSelection } from './addonPricing'

describe('calculateItemTotal', () => {
  it('returns base price × quantity when there are no addons', () => {
    expect(calculateItemTotal(10, 2, [])).toBe(20)
  })

  it('sums addon price × addon quantity on top of the base total', () => {
    // 1x Waffle Normal (R$10) + 2x Banana extra (R$3) + 1x Chocolate branco (R$5)
    const total = calculateItemTotal(10, 1, [
      { price: 3, quantity: 2 },
      { price: 5, quantity: 1 },
    ])
    expect(total).toBe(10 + 3 * 2 + 5 * 1)
  })

  it('multiplies addons-per-unit by product quantity — addon applies to each unit in the line', () => {
    const total = calculateItemTotal(10, 3, [{ price: 2, quantity: 1 }])
    expect(total).toBe((10 + 2) * 3)
  })

  it('regression: 2x Capuccino (R$8) + 1x Morango addon (R$9) = R$34, not R$25', () => {
    expect(calculateItemTotal(8, 2, [{ price: 9, quantity: 1 }])).toBe(34)
  })
})

describe('isValidAddonSelection', () => {
  it('accepts empty selection regardless of rule — always optional', () => {
    expect(isValidAddonSelection({ selectionType: 'single', maxQuantity: 1 }, [])).toBe(true)
    expect(isValidAddonSelection({ selectionType: 'multiple', maxQuantity: null }, [])).toBe(true)
  })

  it('rejects more than 1 distinct option when selectionType is single', () => {
    const rule = { selectionType: 'single' as const, maxQuantity: null }
    expect(isValidAddonSelection(rule, [{ quantity: 1 }])).toBe(true)
    expect(isValidAddonSelection(rule, [{ quantity: 1 }, { quantity: 1 }])).toBe(false)
  })

  it('single selection can still have quantity > 1 for that one option, capped by maxQuantity', () => {
    const rule = { selectionType: 'single' as const, maxQuantity: 2 }
    expect(isValidAddonSelection(rule, [{ quantity: 2 }])).toBe(true)
    expect(isValidAddonSelection(rule, [{ quantity: 3 }])).toBe(false)
  })

  it('rejects total quantity above maxQuantity for multiple selectionType', () => {
    const rule = { selectionType: 'multiple' as const, maxQuantity: 3 }
    expect(isValidAddonSelection(rule, [{ quantity: 2 }, { quantity: 1 }])).toBe(true)
    expect(isValidAddonSelection(rule, [{ quantity: 2 }, { quantity: 2 }])).toBe(false)
  })

  it('accepts any total quantity when maxQuantity is null', () => {
    const rule = { selectionType: 'multiple' as const, maxQuantity: null }
    expect(isValidAddonSelection(rule, [{ quantity: 50 }])).toBe(true)
  })
})
