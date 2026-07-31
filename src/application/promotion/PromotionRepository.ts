import type { Promotion } from '../../domain/promotion/Promotion'

export interface PromotionInput {
  title: string
  subtitle: string | null
  badgeLabel: string | null
  imageUrl: string
  productId: string
  active: boolean
}

export interface PromotionRepository {
  list(storeId: string): Promise<Promotion[]>
  create(storeId: string, input: PromotionInput): Promise<Promotion>
  update(id: string, input: PromotionInput): Promise<void>
  delete(id: string): Promise<void>
  /** Grava a nova ordem do carrossel inteira de uma vez, após o drag. */
  reorder(storeId: string, orderedIds: string[]): Promise<void>
}
