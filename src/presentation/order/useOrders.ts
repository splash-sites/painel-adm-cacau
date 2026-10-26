import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SupabaseOrderRepository } from '../../infrastructure/order/SupabaseOrderRepository'
import type { OrderItemSelection } from '../../application/order/OrderRepository'
import type { OrderStatus } from '../../domain/order/Order'
import { invalidateOrderQueries } from './invalidateOrderQueries'

const orderRepository = new SupabaseOrderRepository()

export function useOrderList(params: { storeId: string }) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => orderRepository.list(params),
    enabled: !!params.storeId,
    // Fallback pro Realtime: se o canal cair (rede, aba suspensa, limite de conexão), o kanban
    // ainda se atualiza sozinho a cada 30s em vez de ficar parado em silêncio.
    refetchInterval: 30_000,
  })
}

export function useChangeOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      orderId,
      newStatus,
      attendantId,
      reason,
    }: {
      orderId: string
      newStatus: OrderStatus
      attendantId?: string
      reason?: string
    }) => orderRepository.changeStatus(orderId, newStatus, attendantId, reason),
    onSuccess: () => {
      invalidateOrderQueries(queryClient)
    },
  })
}

export function useRevertOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderId: string) => orderRepository.revertStatus(orderId),
    onSuccess: () => {
      invalidateOrderQueries(queryClient)
    },
  })
}

export function useAddOrderItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      orderId,
      productId,
      quantity,
      selection,
    }: {
      orderId: string
      productId: string
      quantity: number
      selection?: OrderItemSelection
    }) => orderRepository.addItem(orderId, productId, quantity, selection),
    onSuccess: () => {
      invalidateOrderQueries(queryClient)
    },
  })
}

export function useUpdateOrderItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      itemId,
      quantity,
      selection,
    }: {
      itemId: string
      quantity: number
      selection?: OrderItemSelection
    }) => orderRepository.updateItem(itemId, quantity, selection),
    onSuccess: () => {
      invalidateOrderQueries(queryClient)
    },
  })
}

/** Só quantidade (fora do modo "editar seleção") — não reescreve variação/adicional, evita re-precificar com o valor de hoje. */
export function useUpdateOrderItemQuantity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      orderRepository.updateItemQuantity(itemId, quantity),
    onSuccess: () => {
      invalidateOrderQueries(queryClient)
    },
  })
}

/**
 * Finaliza 1 ou N pedidos (N = "Finalizar tudo" da mesa). isLover = resposta do "Cliente é lover?"
 * (null = não perguntado, pedido sem diferença de preço) — gravado antes do avanço, que passa pelo
 * change_order_status de sempre. Orquestração client-side.
 */
export function useFinalizeOrders() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderIds, isLover }: { orderIds: string[]; isLover: boolean | null }) => {
      const results = await Promise.allSettled(
        orderIds.map(async (orderId) => {
          if (isLover !== null) await orderRepository.setLover(orderId, isLover)
          await orderRepository.changeStatus(orderId, 'finalized')
        }),
      )
      const failed = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      if (failed.length > 0) {
        throw new Error(`${failed.length} de ${orderIds.length} pedidos não finalizaram. Tente de novo.`)
      }
    },
    onSettled: () => {
      invalidateOrderQueries(queryClient)
    },
  })
}

export function useRemoveOrderItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId: string) => orderRepository.removeItem(itemId),
    onSuccess: () => {
      invalidateOrderQueries(queryClient)
    },
  })
}
