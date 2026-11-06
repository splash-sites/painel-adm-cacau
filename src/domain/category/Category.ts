export interface Category {
  id: string
  storeId: string
  name: string
  active: boolean
  /** Ordem no cardápio Cafeteria (dine_in, menor primeiro) — a ordem "de sempre", antes do organizar por canal. */
  sortOrder: number
  /** Ordem no cardápio Para levar/entrega (pickup) — independente da Cafeteria. */
  sortOrderPickup: number
  /** Ordem no cardápio Revendedor (reseller) — independente da Cafeteria. */
  sortOrderReseller: number
}
