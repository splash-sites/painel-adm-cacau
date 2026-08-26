import { describe, expect, it } from 'vitest'
import { isProductIncomplete } from './isProductIncomplete'
import type { Product } from './Product'

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: '1',
    storeId: 'store-1',
    externalCode: 'ABC',
    name: 'Bombom',
    ncm: null,
    unit: null,
    category: 'Chocolates',
    categoryId: 'category-1',
    categoryName: 'Chocolates',
    description: null,
    imageUrl: 'https://example.com/img.png',
    trackStock: false,
    stockQuantity: 0,
    costPrice: null,
    price: 10,
    loverPrice: 8,
    sortOrder: 0,
    active: true,
    availableDineIn: true,
    availablePickup: true,
    availableDelivery: true,
    availableReseller: true,
    ...overrides,
  }
}

describe('isProductIncomplete', () => {
  it('is false when categoryId and imageUrl are set', () => {
    expect(isProductIncomplete(makeProduct())).toBe(false)
  })

  it('is true when categoryId is missing', () => {
    expect(isProductIncomplete(makeProduct({ categoryId: null }))).toBe(true)
  })

  it('is true when imageUrl is missing', () => {
    expect(isProductIncomplete(makeProduct({ imageUrl: null }))).toBe(true)
  })

  it('is true when both are missing', () => {
    expect(isProductIncomplete(makeProduct({ categoryId: null, imageUrl: null }))).toBe(true)
  })
})
