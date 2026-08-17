import { useQuery } from '@tanstack/react-query'
import { SupabaseOrderRepository } from '../../infrastructure/order/SupabaseOrderRepository'
import { type OrderPeriod, sinceIsoForPeriod } from '../../domain/order/orderPeriod'
import type { OrderStatus } from '../../domain/order/Order'

const orderRepository = new SupabaseOrderRepository()

/** "all" não existe em Relatórios (fica só nesta tela) — Histórico é índice de consulta, não KPI de período fechado. */
export type HistoryPeriod = OrderPeriod | 'all'

function sinceIsoForHistory(period: HistoryPeriod): string | undefined {
  return period === 'all' ? undefined : sinceIsoForPeriod(period)
}

export function useOrderHistory(
  storeId: string,
  period: HistoryPeriod,
  status: OrderStatus | undefined,
  page: number,
  pageSize: number,
) {
  const since = sinceIsoForHistory(period)

  return useQuery({
    queryKey: ['order-history', storeId, period, status, page, pageSize],
    queryFn: () => orderRepository.listHistory({ storeId, since, status, page, pageSize }),
    enabled: !!storeId,
  })
}
