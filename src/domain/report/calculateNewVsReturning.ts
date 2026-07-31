import type { Order } from '../order/Order'

export interface NewVsReturningCount {
  newCustomers: number
  returningCustomers: number
}

/**
 * Agrupa pedidos do período por customer_phone (identificador mais confiável — login é opcional
 * no storefront). Recorrente = telefone já tinha pedido antes do início do período filtrado.
 * Conta por cliente único, não por pedido — 2 pedidos novos do mesmo telefone no período = 1 cliente novo.
 * Pedido sem telefone e pedido cancelado não entram na conta.
 */
export function calculateNewVsReturning(orders: Order[], precedingPhones: string[]): NewVsReturningCount {
  const precedingSet = new Set(precedingPhones)
  const seenInPeriod = new Set<string>()
  let newCustomers = 0
  let returningCustomers = 0

  for (const order of orders) {
    if (order.status === 'cancelled') continue
    const phone = order.customerPhone
    if (!phone || seenInPeriod.has(phone)) continue
    seenInPeriod.add(phone)
    if (precedingSet.has(phone)) returningCustomers += 1
    else newCustomers += 1
  }

  return { newCustomers, returningCustomers }
}
