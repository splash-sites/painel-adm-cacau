import type { Order, OrderStatus } from '../../domain/order/Order'
import { calculateItemTotal } from '../../domain/product/addonPricing'
import { applyVariationsToUnitPrice } from '../../domain/product/variationPricing'
import { calculateOrderTotal } from '../../domain/order/orderPricing'

export const BADGE_COLOR: Record<string, string> = {
  Cafeteria: 'bg-accent text-accent-foreground',
  'Retirar no local': 'bg-secondary text-secondary-foreground',
  Delivery: 'bg-red-700 text-white',
  Revendedor: 'bg-secondary/15 text-secondary',
}

/** Banda de status do card — tom suave, paleta funcional (5 marrons da marca ficam indistinguíveis aqui). */
export const STATUS_BAND_CLASS: Record<OrderStatus, string> = {
  received: 'bg-amber-50 text-amber-800',
  preparing: 'bg-amber-50 text-amber-800',
  out_for_delivery: 'bg-blue-50 text-blue-800',
  delivered: 'bg-blue-50 text-blue-800',
  finalized: 'bg-green-50 text-green-800',
  cancelled: 'bg-secondary/10 text-foreground/60',
}

export const STATUS_DOT_CLASS: Record<OrderStatus, string> = {
  received: 'bg-amber-500',
  preparing: 'bg-amber-500',
  out_for_delivery: 'bg-blue-500',
  delivered: 'bg-blue-500',
  finalized: 'bg-green-500',
  cancelled: 'bg-foreground/30',
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
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
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
  return calculateItemTotal(
    applyVariationsToUnitPrice(item.unitPrice, item.variations),
    item.quantity,
    item.addons,
  )
}
