import { supabase } from '../supabase/client'
import type {
  OrderChangeEvent,
  OrderHistoryParams,
  OrderHistoryResult,
  OrderItemSelection,
  OrderListParams,
  OrderRepository,
  OrderStatusHistoryEntry,
} from '../../application/order/OrderRepository'
import type { DeliveryAddress, Order, OrderStatus } from '../../domain/order/Order'
import type { VariationPriceMode } from '../../domain/product/Variation'

function toRpcSelection(selection?: OrderItemSelection) {
  return {
    p_variation_option_ids: selection?.variationOptionIds ?? [],
    p_addons: selection?.addons.map((addon) => ({
      addon_option_id: addon.addonOptionId,
      quantity: addon.quantity,
    })) ?? [],
  }
}

interface OrderItemAddonRow {
  id: string
  addon_option_id: string | null
  name: string
  price: number
  quantity: number
}

interface OrderItemVariationRow {
  id: string
  variation_option_id: string | null
  name: string
  price: number
  price_mode: VariationPriceMode
}

interface OrderItemRow {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  notes: string | null
  promotion_id: string | null
  products: { name: string } | null
  order_item_addons: OrderItemAddonRow[]
  order_item_variations: OrderItemVariationRow[]
}

interface OrderRow {
  id: string
  store_id: string
  customer_id: string | null
  customer_name: string | null
  customer_cpf: string | null
  customer_phone: string | null
  order_type: Order['orderType']
  status: OrderStatus
  sales_channel: Order['salesChannel']
  table_number: string | null
  table_session_id: string | null
  delivery_address: DeliveryAddress | null
  created_at: string
  updated_at: string
  order_items: OrderItemRow[]
  attendant_id: string | null
  attendants: { name: string } | null
  cancellation_reason: string | null
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    storeId: row.store_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerCpf: row.customer_cpf,
    customerPhone: row.customer_phone,
    orderType: row.order_type,
    status: row.status,
    salesChannel: row.sales_channel,
    tableNumber: row.table_number,
    tableSessionId: row.table_session_id,
    deliveryAddress: row.delivery_address,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attendantId: row.attendant_id,
    attendantName: row.attendants?.name ?? null,
    cancellationReason: row.cancellation_reason,
    items: row.order_items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.products?.name ?? '—',
      quantity: item.quantity,
      unitPrice: item.unit_price,
      notes: item.notes,
      promotionId: item.promotion_id,
      addons: item.order_item_addons.map((addon) => ({
        id: addon.id,
        addonOptionId: addon.addon_option_id,
        name: addon.name,
        price: addon.price,
        quantity: addon.quantity,
      })),
      variations: item.order_item_variations.map((variation) => ({
        id: variation.id,
        variationOptionId: variation.variation_option_id,
        name: variation.name,
        price: variation.price,
        priceMode: variation.price_mode,
      })),
    })),
  }
}

function startOfTodayIso(): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.toISOString()
}

const ORDER_SELECT =
  '*, attendants(name), order_items(id, product_id, quantity, unit_price, notes, promotion_id, products(name), order_item_addons(id, addon_option_id, name, price, quantity), order_item_variations(id, variation_option_id, name, price, price_mode))'

export class SupabaseOrderRepository implements OrderRepository {
  async list({ storeId, since }: OrderListParams): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('store_id', storeId)
      .gte('created_at', since ?? startOfTodayIso())
      .order('created_at')

    if (error) throw new Error(error.message)

    return (data as OrderRow[]).map(toOrder)
  }

  async listHistory({ storeId, since, status, page, pageSize }: OrderHistoryParams): Promise<OrderHistoryResult> {
    const from = page * pageSize
    const to = from + pageSize - 1

    let query = supabase.from('orders').select(ORDER_SELECT, { count: 'exact' }).eq('store_id', storeId)

    if (since) {
      query = query.gte('created_at', since)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to)

    if (error) throw new Error(error.message)

    return { items: (data as OrderRow[]).map(toOrder), total: count ?? 0 }
  }

  async changeStatus(orderId: string, newStatus: OrderStatus, attendantId?: string, reason?: string): Promise<void> {
    const { error } = await supabase.rpc('change_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus,
      p_attendant_id: attendantId ?? null,
      p_reason: reason ?? null,
    })
    if (error) throw new Error(error.message)
  }

  async revertStatus(orderId: string): Promise<void> {
    const { error } = await supabase.rpc('revert_order_status', { p_order_id: orderId })
    if (error) throw new Error(error.message)
  }

  async addItem(orderId: string, productId: string, quantity: number, selection?: OrderItemSelection): Promise<void> {
    const { error } = await supabase.rpc('add_order_item', {
      p_order_id: orderId,
      p_product_id: productId,
      p_quantity: quantity,
      ...toRpcSelection(selection),
    })
    if (error) throw new Error(error.message)
  }

  async updateItem(itemId: string, quantity: number, selection?: OrderItemSelection): Promise<void> {
    const { error } = await supabase.rpc('update_order_item', {
      p_item_id: itemId,
      p_quantity: quantity,
      ...toRpcSelection(selection),
    })
    if (error) throw new Error(error.message)
  }

  async removeItem(itemId: string): Promise<void> {
    const { error } = await supabase.rpc('remove_order_item', { p_item_id: itemId })
    if (error) throw new Error(error.message)
  }

  async listStatusHistory(storeId: string, since: string): Promise<OrderStatusHistoryEntry[]> {
    const { data, error } = await supabase
      .from('order_status_history')
      .select('order_id, status, changed_at, orders!inner(store_id, created_at)')
      .eq('orders.store_id', storeId)
      .gte('orders.created_at', since)

    if (error) throw new Error(error.message)

    return (data as { order_id: string; status: OrderStatus; changed_at: string }[]).map((row) => ({
      orderId: row.order_id,
      status: row.status,
      changedAt: row.changed_at,
    }))
  }

  async listPrecedingCustomerPhones(storeId: string, beforeIso: string, phones: string[]): Promise<string[]> {
    if (phones.length === 0) return []

    const { data, error } = await supabase
      .from('orders')
      .select('customer_phone')
      .eq('store_id', storeId)
      .lt('created_at', beforeIso)
      .in('customer_phone', phones)

    if (error) throw new Error(error.message)

    return (data as { customer_phone: string | null }[])
      .map((row) => row.customer_phone)
      .filter((phone): phone is string => phone != null)
  }

  subscribeToStoreOrders(storeId: string, onChange: (eventType: OrderChangeEvent) => void): () => void {
    const channel = supabase
      .channel(`orders-${storeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        (payload) => onChange(payload.eventType as OrderChangeEvent),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }
}
