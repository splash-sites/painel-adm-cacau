export interface Product {
  id: string
  storeId: string
  externalCode: string
  name: string
  ncm: string | null
  unit: string | null
  /** @deprecated texto livre, mantido só por compatibilidade — usar categoryId/categoryName. */
  category: string | null
  categoryId: string | null
  /** Nome da categoria vinculada — join só pra exibição. */
  categoryName: string | null
  description: string | null
  imageUrl: string | null
  trackStock: boolean
  stockQuantity: number
  /** Saldo reservado ao canal revendedor — separado de stockQuantity. */
  resellerStockQuantity: number
  /** Liga/desliga próprio do canal revendedor — independe de trackStock (estoque normal). */
  resellerTrackStock: boolean
  costPrice: number | null
  price: number
  loverPrice: number
  /** Ordem no cardápio Cafeteria (dine_in) — a ordem "de sempre", a mesma coluna de antes do organizar por canal. */
  sortOrder: number
  /** Ordem no cardápio Para levar/entrega (pickup) — independente da Cafeteria. */
  sortOrderPickup: number
  /** Ordem no cardápio Revendedor (reseller) — independente da Cafeteria. */
  sortOrderReseller: number
  active: boolean
  availableDineIn: boolean
  availablePickup: boolean
  availableDelivery: boolean
  availableReseller: boolean
}
