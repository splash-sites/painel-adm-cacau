import { describe, expect, it } from 'vitest'
import { groupOrderItemsByPromotion } from './orderItemGrouping'
import type { OrderItem } from './Order'

function makeItem(overrides: Partial<OrderItem> & { id: string }): OrderItem {
  return {
    productId: 'p',
    productName: 'Produto',
    quantity: 1,
    unitPrice: 10,
    notes: null,
    addons: [],
    variations: [],
    promotionId: null,
    ...overrides,
  }
}

describe('groupOrderItemsByPromotion', () => {
  it('puts each item without a promotion in its own group', () => {
    const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' })]
    const groups = groupOrderItemsByPromotion(items)
    expect(groups).toEqual([
      { promotionId: null, items: [items[0]] },
      { promotionId: null, items: [items[1]] },
    ])
  })

  it('groups items sharing the same promotionId together', () => {
    const items = [
      makeItem({ id: 'agua', promotionId: 'combo-1' }),
      makeItem({ id: 'refri' }),
      makeItem({ id: 'fondue', promotionId: 'combo-1' }),
    ]
    const groups = groupOrderItemsByPromotion(items)
    expect(groups).toHaveLength(2)
    expect(groups[0]).toEqual({ promotionId: 'combo-1', items: [items[0], items[2]] })
    expect(groups[1]).toEqual({ promotionId: null, items: [items[1]] })
  })

  it('keeps 2 different combos in the same order separate', () => {
    const items = [
      makeItem({ id: 'a', promotionId: 'combo-1' }),
      makeItem({ id: 'b', promotionId: 'combo-2' }),
      makeItem({ id: 'c', promotionId: 'combo-1' }),
    ]
    const groups = groupOrderItemsByPromotion(items)
    expect(groups.map((g) => g.promotionId)).toEqual(['combo-1', 'combo-2'])
    expect(groups[0].items.map((i) => i.id)).toEqual(['a', 'c'])
    expect(groups[1].items.map((i) => i.id)).toEqual(['b'])
  })
})
