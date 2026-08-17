import { useQuery } from '@tanstack/react-query'
import { SupabaseOrderRepository } from '../../infrastructure/order/SupabaseOrderRepository'
import { type OrderPeriod, sinceIsoForPeriod } from '../../domain/order/orderPeriod'
import { calculateReportSummary } from '../../domain/report/calculateReportSummary'
import { calculateAveragePrepTimeMinutes } from '../../domain/report/calculatePrepTime'
import { calculateNewVsReturning } from '../../domain/report/calculateNewVsReturning'
import { calculateRevenueSeries } from '../../domain/report/calculateRevenueSeries'
import { calculateOrdersByHour } from '../../domain/report/calculateOrdersByHour'

const orderRepository = new SupabaseOrderRepository()

export type ReportPeriod = OrderPeriod

export function useReportSummary(storeId: string, period: ReportPeriod) {
  const since = sinceIsoForPeriod(period)

  const {
    data: orders,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['report-orders', storeId, period],
    queryFn: () => orderRepository.list({ storeId, since }),
    enabled: !!storeId,
  })

  const { data: statusHistory } = useQuery({
    queryKey: ['report-status-history', storeId, since],
    queryFn: () => orderRepository.listStatusHistory(storeId, since),
    enabled: !!storeId,
  })

  // Só telefones do período atual — escopa a query ao invés de crescer com todo histórico da loja.
  const currentPeriodPhones = orders
    ? Array.from(new Set(orders.map((order) => order.customerPhone).filter((phone): phone is string => phone != null)))
    : []

  const { data: precedingPhones } = useQuery({
    queryKey: ['report-preceding-phones', storeId, since, currentPeriodPhones],
    queryFn: () => orderRepository.listPrecedingCustomerPhones(storeId, since, currentPeriodPhones),
    enabled: !!storeId && !!orders,
  })

  return {
    summary: orders ? calculateReportSummary(orders) : undefined,
    revenueSeries: orders ? calculateRevenueSeries(orders, period === 'today' ? 'hour' : 'day') : undefined,
    ordersByHour: orders ? calculateOrdersByHour(orders) : undefined,
    avgPrepTimeMinutes: statusHistory ? calculateAveragePrepTimeMinutes(statusHistory) : undefined,
    newVsReturning:
      orders && precedingPhones ? calculateNewVsReturning(orders, precedingPhones) : undefined,
    isLoading,
    error,
  }
}
