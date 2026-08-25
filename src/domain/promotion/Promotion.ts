export type PromotionDiscountType = 'percent' | 'fixed_amount'

/** name/price são snapshot só de exibição no form — o vínculo real é product_id + quantity, preço sempre lido ao vivo do produto. */
export interface PromotionComboItem {
  id: string
  productId: string
  productName: string
  quantity: number
}

export interface Promotion {
  id: string
  storeId: string
  title: string
  subtitle: string | null
  badgeLabel: string | null
  imageUrl: string
  productId: string
  /** Nome do produto vinculado — join só pra exibição, nunca referencia preço (carrossel sempre lê do produto ao vivo). */
  productName: string
  sortOrder: number
  active: boolean
  /** null = promoção sem desconto (só destaque visual, comportamento original). */
  discountType: PromotionDiscountType | null
  discountValue: number | null
  /** Produtos extras além do productId principal — presença de 1+ item é o que torna a promoção um "combo". */
  comboItems: PromotionComboItem[]
}
