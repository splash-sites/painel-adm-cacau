import type { Order, OrderStatus } from '../../domain/order/Order'

export interface OrderListParams {
  storeId: string
  /** ISO datetime — pedidos criados a partir daqui. Default (quando omitido): início do dia de hoje, pro Dashboard. */
  since?: string
}

export type OrderChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

export interface OrderItemAddonSelection {
  addonOptionId: string
  quantity: number
}

/** variationOptionIds cobre 1 opção por grupo de variação obrigatório do produto — validado client + RPC. */
export interface OrderItemSelection {
  variationOptionIds: string[]
  addons: OrderItemAddonSelection[]
}

export interface OrderStatusHistoryEntry {
  orderId: string
  status: OrderStatus
  changedAt: string
}

export interface OrderRepository {
  list(params: OrderListParams): Promise<Order[]>
  /**
   * attendantId só é exigido (e só faz efeito) na transição received -> preparing — ver needsAttendantToAdvance.
   * reason só é exigido (e só faz efeito) na transição pra "cancelled" — ver needsReasonToCancel.
   */
  changeStatus(orderId: string, newStatus: OrderStatus, attendantId?: string, reason?: string): Promise<void>
  revertStatus(orderId: string): Promise<void>
  addItem(orderId: string, productId: string, quantity: number, selection?: OrderItemSelection): Promise<void>
  /** Atualiza quantidade e reescreve por completo a variação/adicional do item (não é um patch parcial). */
  updateItem(itemId: string, quantity: number, selection?: OrderItemSelection): Promise<void>
  removeItem(itemId: string): Promise<void>
  subscribeToStoreOrders(storeId: string, onChange: (eventType: OrderChangeEvent) => void): () => void
  /** Histórico de status da loja desde `since` — filtrado no banco (join com orders), nunca por lista de IDs (risco de URL gigante). */
  listStatusHistory(storeId: string, since: string): Promise<OrderStatusHistoryEntry[]>
  /**
   * De `phones`, quais já tinham pedido antes de `beforeIso` — escopado à lista de telefones do
   * período atual (não a todo histórico da loja), pra não crescer sem limite com o tempo de vida da loja.
   */
  listPrecedingCustomerPhones(storeId: string, beforeIso: string, phones: string[]): Promise<string[]>
}
