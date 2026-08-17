import type { Order, OrderStatus, OrderType } from './Order'

/**
 * "delivered" (Entregue) marca só que o cliente já recebeu o pedido — "finalized" fica reservado
 * pro fechamento depois do pagamento confirmado (pedido da cliente Julia, separar entrega de pagamento).
 */
const FLOW: OrderStatus[] = ['received', 'preparing', 'out_for_delivery', 'delivered', 'finalized']

/** Mesa não "sai pra entrega" nem "fica pronta pra retirar" — pula direto pra "Entregue" (serviu a mesa). */
const DINE_IN_FLOW: OrderStatus[] = ['received', 'preparing', 'delivered', 'finalized']

function flowFor(orderType: OrderType): OrderStatus[] {
  return orderType === 'dine_in' ? DINE_IN_FLOW : FLOW
}

const CANCELLABLE_STATUSES: OrderStatus[] = ['received']

/** Depois de finalizado não dá mais pra voltar — "entregue" é o último ponto revertível. */
const REVERTIBLE_STATUSES: OrderStatus[] = ['preparing', 'out_for_delivery', 'delivered']

export interface KanbanColumn {
  key: string
  label: string
  matches: (order: Pick<Order, 'status' | 'orderType'>) => boolean
}

/**
 * Cancelado não aparece no board — o botão Cancelar continua funcionando, só some da tela.
 * "out_for_delivery" vira duas colunas na tela (mesmo status por trás): pickup cai em
 * "Pronto para retirada", dine_in/delivery caem em "Saiu pra entrega".
 */
export const KANBAN_COLUMNS: KanbanColumn[] = [
  { key: 'received', label: 'Recebido', matches: (order) => order.status === 'received' },
  { key: 'preparing', label: 'Em preparo', matches: (order) => order.status === 'preparing' },
  {
    key: 'out_for_delivery',
    label: 'Saiu pra entrega',
    matches: (order) => order.status === 'out_for_delivery' && order.orderType !== 'pickup',
  },
  {
    key: 'ready_for_pickup',
    label: 'Pronto para retirada',
    matches: (order) => order.status === 'out_for_delivery' && order.orderType === 'pickup',
  },
  { key: 'delivered', label: 'Entregue', matches: (order) => order.status === 'delivered' },
  { key: 'finalized', label: 'Finalizado', matches: (order) => order.status === 'finalized' },
]

export function getNextStatus(status: OrderStatus, orderType: OrderType): OrderStatus | null {
  const flow = flowFor(orderType)
  const index = flow.indexOf(status)
  if (index === -1 || index === flow.length - 1) return null
  return flow[index + 1]
}

export function getPreviousStatus(status: OrderStatus, orderType: OrderType): OrderStatus | null {
  const flow = flowFor(orderType)
  const index = flow.indexOf(status)
  if (index <= 0) return null
  return flow[index - 1]
}

export function canCancel(status: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status)
}

/**
 * Cancelar (loja recusando/desistindo do pedido, ou cliente) sempre exige motivo — pedido da
 * cliente Julia, pra ficar registrado por que o pedido não seguiu. Único gatilho hoje é
 * `canCancel`, mas nome próprio deixa a regra fácil de achar/testar separada.
 */
export function needsReasonToCancel(status: OrderStatus): boolean {
  return canCancel(status)
}

export function canRevert(status: OrderStatus): boolean {
  return REVERTIBLE_STATUSES.includes(status)
}

/** Depois que entra em preparo, a cozinha já começou — não dá mais pra mexer no pedido. */
export function canEditItems(status: OrderStatus): boolean {
  return status === 'received'
}

/**
 * Aceitar o pedido (received -> preparing) exige escolher quem vai preparar — trava só nesse
 * ponto, nunca muda depois. Reverter pra received limpa o atendente (RPC), então avançar de
 * novo volta a pedir.
 */
export function needsAttendantToAdvance(status: OrderStatus): boolean {
  return status === 'received'
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Recebido',
  preparing: 'Em preparo',
  out_for_delivery: 'Saiu pra entrega',
  delivered: 'Entregue',
  finalized: 'Finalizado',
  cancelled: 'Cancelado',
}

/**
 * "out_for_delivery" pra quem retira no local não "saiu pra entrega" — mesmo status,
 * texto diferente. Sem orderType, mostra o rótulo padrão (uso em header de coluna,
 * que agrupa tipo misturado).
 */
export function statusLabel(status: OrderStatus, orderType?: OrderType): string {
  if (status === 'out_for_delivery' && orderType === 'pickup') return 'Pronto para retirada'
  return STATUS_LABELS[status]
}

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  dine_in: 'Cafeteria',
  pickup: 'Retirar no local',
  delivery: 'Delivery',
}

/** Revendedor é dimensão separada de orderType — nunca combina com dine_in (ver "Canal de revendedor"). */
export function orderChannelLabel(order: Pick<Order, 'orderType' | 'salesChannel'>): string {
  return order.salesChannel === 'reseller' ? 'Revendedor' : ORDER_TYPE_LABEL[order.orderType]
}
