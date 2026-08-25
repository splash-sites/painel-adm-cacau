export type PromotionDiscountType = 'percent' | 'fixed_amount'

/** name/price são só pra exibição no form (preço ao vivo, buscado na leitura) — o vínculo real é product_id + quantity, nunca fica congelado. */
export interface PromotionComboItem {
  id: string
  productId: string
  productName: string
  price: number
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
