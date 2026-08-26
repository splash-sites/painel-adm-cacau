import { describe, expect, it } from 'vitest'
import { productSchema } from './productSchema'

function makeInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    externalCode: 'ABC',
    name: 'Bombom',
    categoryId: null,
    trackStock: false,
    stockQuantity: 10,
    price: 5.9,
    loverPrice: 4.5,
    active: true,
    availableDineIn: true,
    availablePickup: true,
    availableDelivery: true,
    availableReseller: true,
    ...overrides,
  }
}

describe('productSchema', () => {
  it('accepts a valid product', () => {
    const result = productSchema.safeParse(makeInput())
    expect(result.success).toBe(true)
  })

  it('rejects empty externalCode', () => {
    expect(productSchema.safeParse(makeInput({ externalCode: '' })).success).toBe(false)
  })

  it('rejects empty name', () => {
    expect(productSchema.safeParse(makeInput({ name: '' })).success).toBe(false)
  })

  it('rejects negative stockQuantity', () => {
    expect(productSchema.safeParse(makeInput({ stockQuantity: -1 })).success).toBe(false)
  })

  it('rejects negative price', () => {
    expect(productSchema.safeParse(makeInput({ price: -1 })).success).toBe(false)
  })

  it('rejects negative loverPrice', () => {
    expect(productSchema.safeParse(makeInput({ loverPrice: -1 })).success).toBe(false)
  })

  it('coerces string numbers for numeric fields', () => {
    const result = productSchema.safeParse(
      makeInput({ stockQuantity: '10', price: '5.9', loverPrice: '4.5', sortOrder: '2' }),
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.stockQuantity).toBe(10)
      expect(result.data.sortOrder).toBe(2)
    }
  })

  it('defaults sortOrder to 0 when omitted', () => {
    const result = productSchema.safeParse(makeInput())
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.sortOrder).toBe(0)
  })
})
