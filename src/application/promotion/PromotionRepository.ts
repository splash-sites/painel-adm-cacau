import type { Promotion, PromotionDiscountType } from '../../domain/promotion/Promotion'

export interface PromotionComboItemInput {
  productId: string
  quantity: number
}

export interface PromotionInput {
  title: string
  subtitle: string | null
  badgeLabel: string | null
  imageUrl: string
  productId: string
  active: boolean
  discountType: PromotionDiscountType | null
  discountValue: number | null
  /** Reescrito por completo a cada save (delete + insert), mesmo princípio de order_item_variations. */
  comboItems: PromotionComboItemInput[]
}

export interface PromotionRepository {
  list(storeId: string): Promise<Promotion[]>
  create(storeId: string, input: PromotionInput): Promise<Promotion>
  update(id: string, input: PromotionInput): Promise<void>
  delete(id: string): Promise<void>
  /** Grava a nova ordem do carrossel inteira de uma vez, após o drag. */
  reorder(storeId: string, orderedIds: string[]): Promise<void>
}
