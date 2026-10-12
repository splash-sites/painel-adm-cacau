import type { Order, OrderStatus } from '../../domain/order/Order'
import { calculateItemRegularTotal, calculateOrderTotal } from '../../domain/order/orderPricing'

export const BADGE_COLOR: Record<string, string> = {
  Cafeteria: 'bg-surface-2 text-ink',
  'Retirar no local': 'bg-surface-2 text-ink',
  Delivery: 'bg-info-soft text-info',
  Revendedor: 'bg-wait-soft text-wait',
}

/** Cor do status: espera em caramelo, a caminho em azul, fechado em verde. */
export const STATUS_BAND_CLASS: Record<OrderStatus, string> = {
  received: 'bg-wait-soft text-wait',
  preparing: 'bg-wait-soft text-wait',
  out_for_delivery: 'bg-info-soft text-info',
  delivered: 'bg-info-soft text-info',
  finalized: 'bg-success-soft text-success',
  cancelled: 'bg-surface-2 text-muted',
}

export const STATUS_DOT_CLASS: Record<OrderStatus, string> = {
  received: 'bg-caramel',
  preparing: 'bg-caramel',
  out_for_delivery: 'bg-info',
  delivered: 'bg-info',
  finalized: 'bg-success',
  cancelled: 'bg-faint',
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function whatsAppDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`
}

export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 11) return value
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return value
}

export function formatName(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function whatsAppLink(order: Order): string {
  const itemsText = order.items.map((item) => `${item.quantity}x ${item.productName}`).join('\n')
  const total = formatCurrency(calculateOrderTotal(order))
  const greeting = order.customerName ? `Olá, ${order.customerName}!` : 'Olá!'
  const message = `${greeting} Sobre seu pedido:\n${itemsText}\nTotal: ${total}`

  return `https://wa.me/${whatsAppDigits(order.customerPhone ?? '')}?text=${encodeURIComponent(message)}`
}

export function itemTotal(item: Order['items'][number]): number {
  return calculateItemRegularTotal(item)
}
