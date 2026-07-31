import type { OrderStatus } from '../order/Order'

export interface StatusHistoryEntry {
  orderId: string
  status: OrderStatus
  changedAt: string
}

/**
 * Minutos médios entre entrar e sair de "preparing" (cozinha aceitou até avançar/finalizar).
 * Pedido que ainda está em "preparing" (sem próxima transição) não conta — tempo incompleto.
 * null quando nenhum pedido do período completou essa fase.
 */
export function calculateAveragePrepTimeMinutes(entries: StatusHistoryEntry[]): number | null {
  const entriesByOrder = new Map<string, StatusHistoryEntry[]>()
  for (const entry of entries) {
    const list = entriesByOrder.get(entry.orderId) ?? []
    list.push(entry)
    entriesByOrder.set(entry.orderId, list)
  }

  const durationsMinutes: number[] = []
  for (const orderEntries of entriesByOrder.values()) {
    const sorted = [...orderEntries].sort(
      (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime(),
    )
    const preparingIndex = sorted.findIndex((entry) => entry.status === 'preparing')
    if (preparingIndex === -1 || preparingIndex === sorted.length - 1) continue

    const start = new Date(sorted[preparingIndex].changedAt).getTime()
    const end = new Date(sorted[preparingIndex + 1].changedAt).getTime()
    durationsMinutes.push((end - start) / 60_000)
  }

  if (durationsMinutes.length === 0) return null
  return durationsMinutes.reduce((sum, value) => sum + value, 0) / durationsMinutes.length
}
