import { describe, expect, it } from 'vitest'
import {
  calculatePromotionBaseTotal,
  calculatePromotionDiscountedTotal,
  distributePromotionDiscount,
} from './promotionPricing'

function sumLines(lines: { unitPrice: number; quantity: number }[]): number {
  return Math.round(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0) * 100) / 100
}

describe('calculatePromotionBaseTotal', () => {
  it('is just the main product price with no combo items', () => {
    expect(calculatePromotionBaseTotal(10, [])).toBe(10)
  })

  it('sums the main product with each combo item price times quantity', () => {
    expect(
      calculatePromotionBaseTotal(10, [
        { price: 5, quantity: 2 },
        { price: 3, quantity: 1 },
      ]),
    ).toBe(23)
  })
})

describe('calculatePromotionDiscountedTotal', () => {
  it('returns the base total unchanged when there is no discount', () => {
    expect(calculatePromotionDiscountedTotal(20, { discountType: null, discountValue: null })).toBe(20)
  })

  it('applies a percent discount', () => {
    expect(calculatePromotionDiscountedTotal(20, { discountType: 'percent', discountValue: 25 })).toBe(15)
  })

  it('applies a fixed amount discount', () => {
    expect(calculatePromotionDiscountedTotal(20, { discountType: 'fixed_amount', discountValue: 5 })).toBe(15)
  })

  it('never goes negative even if the discount overshoots', () => {
    expect(calculatePromotionDiscountedTotal(20, { discountType: 'fixed_amount', discountValue: 999 })).toBe(0)
    expect(calculatePromotionDiscountedTotal(20, { discountType: 'percent', discountValue: 150 })).toBe(0)
  })
})

describe('distributePromotionDiscount', () => {
  it('with no discount, every line keeps its own live price', () => {
    const lines = distributePromotionDiscount(
      { productId: 'agua', price: 5 },
      [{ productId: 'fondue', price: 20, quantity: 1 }],
      { discountType: null, discountValue: null },
    )
    expect(lines).toEqual([
      { productId: 'agua', quantity: 1, unitPrice: 5 },
      { productId: 'fondue', quantity: 1, unitPrice: 20 },
    ])
  })

  it('splits a clean percent discount proportionally', () => {
    const lines = distributePromotionDiscount(
      { productId: 'agua', price: 5 },
      [{ productId: 'fondue', price: 20, quantity: 1 }],
      { discountType: 'percent', discountValue: 20 },
    )
    // base 25, descontado 20% = 20 -> agua 4, fondue 16 (proporcional exato, sem sobra de centavo)
    expect(lines).toEqual([
      { productId: 'agua', quantity: 1, unitPrice: 4 },
      { productId: 'fondue', quantity: 1, unitPrice: 16 },
    ])
    expect(sumLines(lines)).toBe(20)
  })

  it('always sums to exactly the discounted total, even with an ugly remainder', () => {
    // base = 3(x2) + 3.33 + 7.77 = 6 + 3.33 + 7.77 = 17.10; 15% off -> 14.535
    const lines = distributePromotionDiscount(
      { productId: 'a', price: 3 },
      [
        { productId: 'b', price: 3.33, quantity: 1 },
        { productId: 'c', price: 7.77, quantity: 2 },
      ],
      { discountType: 'percent', discountValue: 15 },
    )
    const baseTotal = calculatePromotionBaseTotal(3, [
      { price: 3.33, quantity: 1 },
      { price: 7.77, quantity: 2 },
    ])
    const discountedTotal = calculatePromotionDiscountedTotal(baseTotal, { discountType: 'percent', discountValue: 15 })
    expect(sumLines(lines)).toBe(Math.round(discountedTotal * 100) / 100)
  })

  it('sums exactly across many random-ish combos (property check)', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const mainPrice = ((seed * 37) % 50) + 1.11
      const comboItems = [
        { productId: 'x', price: ((seed * 13) % 40) + 0.5, quantity: (seed % 3) + 1 },
        { productId: 'y', price: ((seed * 29) % 60) + 2.25, quantity: (seed % 4) + 1 },
      ]
      const discountType = seed % 2 === 0 ? 'percent' : 'fixed_amount'
      const discountValue = discountType === 'percent' ? (seed % 90) + 1 : ((seed * 3) % 20) + 1

      const lines = distributePromotionDiscount({ productId: 'main', price: mainPrice }, comboItems, {
        discountType,
        discountValue,
      })

      const baseTotal = calculatePromotionBaseTotal(mainPrice, comboItems)
      const expected = Math.round(calculatePromotionDiscountedTotal(baseTotal, { discountType, discountValue }) * 100) / 100
      expect(sumLines(lines)).toBe(expected)
    }
  })

  it('every line stays at 0 when the base total is 0', () => {
    const lines = distributePromotionDiscount(
      { productId: 'a', price: 0 },
      [{ productId: 'b', price: 0, quantity: 3 }],
      { discountType: 'percent', discountValue: 50 },
    )
    expect(lines).toEqual([
      { productId: 'a', quantity: 1, unitPrice: 0 },
      { productId: 'b', quantity: 3, unitPrice: 0 },
    ])
  })
})
