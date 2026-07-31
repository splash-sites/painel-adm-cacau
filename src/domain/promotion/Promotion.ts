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
}
