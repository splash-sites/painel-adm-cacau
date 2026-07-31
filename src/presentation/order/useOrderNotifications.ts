import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { SupabaseOrderRepository } from '../../infrastructure/order/SupabaseOrderRepository'
import { notifyNewOrder } from './notifyNewOrder'

const orderRepository = new SupabaseOrderRepository()

/** Chamado no AppLayout — fica montado em qualquer tela do painel, não só no Dashboard. */
export function useOrderNotifications(storeId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!storeId) return
    return orderRepository.subscribeToStoreOrders(storeId, (eventType) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      if (eventType === 'INSERT') {
        notifyNewOrder(storeId)
      }
    })
  }, [storeId, queryClient])
}
