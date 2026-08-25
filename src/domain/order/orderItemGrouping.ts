import type { OrderItem } from './Order'

export interface OrderItemGroup {
  /** null = item avulso, sem promoção — cada um vira o próprio grupo de 1 item. */
  promotionId: string | null
  items: OrderItem[]
}

/**
 * Agrupa itens do pedido que vieram do mesmo combo (mesmo promotionId) — pra exibir como 1
 * bloco visual só, em vez de linhas soltas sem relação nenhuma. Preserva a ordem de chegada.
 */
export function groupOrderItemsByPromotion(items: OrderItem[]): OrderItemGroup[] {
  const groups: OrderItemGroup[] = []
  const indexByPromotionId = new Map<string, number>()

  for (const item of items) {
    if (!item.promotionId) {
      groups.push({ promotionId: null, items: [item] })
      continue
    }

    const existingIndex = indexByPromotionId.get(item.promotionId)
    if (existingIndex != null) {
      groups[existingIndex].items.push(item)
      continue
    }

    indexByPromotionId.set(item.promotionId, groups.length)
    groups.push({ promotionId: item.promotionId, items: [item] })
  }

  return groups
}
