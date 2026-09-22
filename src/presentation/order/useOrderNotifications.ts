import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { SupabaseOrderRepository } from '../../infrastructure/order/SupabaseOrderRepository'
import { invalidateOrderQueries } from './invalidateOrderQueries'
import { notifyNewOrder } from './notifyNewOrder'
import { useRealtimeConnection } from './useRealtimeConnection'

const orderRepository = new SupabaseOrderRepository()

/** Chamado no AppLayout — fica montado em qualquer tela do painel, não só no Dashboard. */
export function useOrderNotifications(storeId: string) {
  const queryClient = useQueryClient()
  const setConnectionStatus = useRealtimeConnection((state) => state.setStatus)

  useEffect(() => {
    if (!storeId) return
    return orderRepository.subscribeToStoreOrders(
      storeId,
      (eventType) => {
        invalidateOrderQueries(queryClient)
        if (eventType === 'INSERT') {
          notifyNewOrder(storeId)
        }
      },
      setConnectionStatus,
    )
  }, [storeId, queryClient, setConnectionStatus])
}
