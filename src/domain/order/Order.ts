import type { VariationPriceMode } from '../product/Variation'

export type OrderType = 'dine_in' | 'pickup' | 'delivery'
export type SalesChannel = 'retail' | 'reseller'

export type OrderStatus = 'received' | 'preparing' | 'out_for_delivery' | 'delivered' | 'finalized' | 'cancelled'

/** Snapshot do adicional no momento do pedido — nome/preço nunca voltam a consultar addon_options. */
export interface OrderItemAddon {
  id: string
  addonOptionId: string | null
  name: string
  price: number
  quantity: number
}

/** Snapshot da variação escolhida no momento do pedido — nome/preço/priceMode nunca voltam a consultar variation_options/variation_groups ao vivo. */
export interface OrderItemVariation {
  id: string
  variationOptionId: string | null
  name: string
  price: number
  priceMode: VariationPriceMode
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  notes: string | null
  addons: OrderItemAddon[]
  variations: OrderItemVariation[]
}

/** Contrato com o storefront: é isso que ele precisa mandar no checkout de delivery. */
export interface DeliveryAddress {
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
}

export interface Order {
  id: string
  storeId: string
  customerId: string | null
  customerName: string | null
  customerCpf: string | null
  customerPhone: string | null
  orderType: OrderType
  status: OrderStatus
  salesChannel: SalesChannel
  tableNumber: string | null
  /** Comanda da mesa (consolidação de pedidos de celulares diferentes) — null pra order_type != dine_in ou enquanto o storefront não vincula. */
  tableSessionId: string | null
  deliveryAddress: DeliveryAddress | null
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  /** Quem prepara — vinculado só na transição received -> preparing, trava depois (ver needsAttendantToAdvance). Null enquanto ainda tá "received". */
  attendantId: string | null
  attendantName: string | null
  /** Preenchido só na transição pra "cancelled" (loja ou cliente) — null pra qualquer outro status. */
  cancellationReason: string | null
}
