import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SupabaseOrderRepository } from '../../infrastructure/order/SupabaseOrderRepository'
import type { OrderItemSelection } from '../../application/order/OrderRepository'
import type { OrderStatus } from '../../domain/order/Order'

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
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useRevertOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderId: string) => orderRepository.revertStatus(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
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
      queryClient.invalidateQueries({ queryKey: ['orders'] })
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
      queryClient.invalidateQueries({ queryKey: ['orders'] })
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
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

/** Bulk pra "Finalizar tudo" do card mesclado de mesa — cada avanço passa pelo change_order_status de sempre, só a orquestração é client-side. */
export function useFinalizeTableOrders() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      const results = await Promise.allSettled(
        orderIds.map((orderId) => orderRepository.changeStatus(orderId, 'finalized')),
      )
      const failed = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      if (failed.length > 0) {
        throw new Error(`${failed.length} de ${orderIds.length} pedido(s) não finalizaram — tenta de novo.`)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useRemoveOrderItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId: string) => orderRepository.removeItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
