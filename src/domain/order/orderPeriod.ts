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

/**
 * Corte de visibilidade do Finalizado no Dashboard: o mais recente entre a limpeza manual
 * ("Zerar") e o início do dia de hoje — o painel "zera" sozinho à meia-noite sem job/cron
 * nenhum, só recalculando a cada render. Pedido cancelado/finalizado antigo continua no
 * Histórico, que nunca usa esse corte.
 */
export function dashboardFinalizedCutoff(clearedAt: string | null): string {
  const todayStart = sinceIsoForPeriod('today')
  return clearedAt && clearedAt > todayStart ? clearedAt : todayStart
}
