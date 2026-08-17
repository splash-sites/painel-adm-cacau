export type OrderPeriod = 'today' | '7d' | '30d'

/** Sempre horário local, nunca UTC — mesmo motivo de startOfTodayIso (pedido de madrugada não cai no dia errado). */
export function sinceIsoForPeriod(period: OrderPeriod): string {
  const since = new Date()
  if (period === 'today') {
    since.setHours(0, 0, 0, 0)
    return since.toISOString()
  }
  since.setDate(since.getDate() - (period === '7d' ? 7 : 30))
  return since.toISOString()
}
