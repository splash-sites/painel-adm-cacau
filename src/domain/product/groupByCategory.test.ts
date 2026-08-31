import { describe, expect, it } from 'vitest'
import { groupByCategory } from './groupByCategory'
import type { Category } from '../category/Category'
import type { Product } from './Product'

function cat(id: string, name: string, sortOrder: number): Category {
  return { id, storeId: 's1', name, active: true, sortOrder }
}

function prod(id: string, name: string, categoryId: string | null, sortOrder: number): Product {
  return {
    id,
    storeId: 's1',
    externalCode: id,
    name,
    ncm: null,
    unit: null,
    category: null,
    categoryId,
    categoryName: null,
    description: null,
    imageUrl: null,
    trackStock: false,
    stockQuantity: 0,
    costPrice: null,
    price: 0,
    loverPrice: 0,
    sortOrder,
    active: true,
    availableDineIn: true,
    availablePickup: true,
    availableDelivery: false,
    availableReseller: false,
  }
}

describe('groupByCategory', () => {
  const bebidas = cat('c-beb', 'Bebidas', 0)
  const doces = cat('c-doc', 'Doces', 1)

  it('groups by category in category sortOrder, products by sortOrder then name', () => {
    const products = [
      prod('p3', 'Chá', 'c-beb', 2),
      prod('p1', 'Café', 'c-beb', 0),
      prod('p2', 'Água', 'c-beb', 0), // empata sortOrder com p1 -> desempata por nome
      prod('p4', 'Bolo', 'c-doc', 0),
    ]

    const groups = groupByCategory(products, [doces, bebidas]) // passa fora de ordem de propósito

    expect(groups.map((g) => g.category?.name)).toEqual(['Bebidas', 'Doces'])
    expect(groups[0].products.map((p) => p.name)).toEqual(['Água', 'Café', 'Chá'])
    expect(groups[1].products.map((p) => p.name)).toEqual(['Bolo'])
  })

  it('keeps categories with no products (empty group)', () => {
    const groups = groupByCategory([prod('p1', 'Café', 'c-beb', 0)], [bebidas, doces])
    expect(groups[1].category?.name).toBe('Doces')
    expect(groups[1].products).toEqual([])
  })

  it('puts uncategorized products in a null group at the end, only when present', () => {
    const withNull = groupByCategory(
      [prod('p1', 'Café', 'c-beb', 0), prod('p9', 'Item solto', null, 0)],
      [bebidas],
    )
    expect(withNull.at(-1)?.category).toBeNull()
    expect(withNull.at(-1)?.products.map((p) => p.name)).toEqual(['Item solto'])

    const withoutNull = groupByCategory([prod('p1', 'Café', 'c-beb', 0)], [bebidas])
    expect(withoutNull.some((g) => g.category === null)).toBe(false)
  })
})
