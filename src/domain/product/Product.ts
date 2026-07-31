export interface Product {
  id: string
  storeId: string
  externalCode: string
  name: string
  ncm: string | null
  unit: string | null
  category: string | null
  description: string | null
  imageUrl: string | null
  trackStock: boolean
  stockQuantity: number
  costPrice: number | null
  price: number
  loverPrice: number
  sortOrder: number
  active: boolean
  availableDineIn: boolean
  availablePickup: boolean
  availableDelivery: boolean
  availableReseller: boolean
}
