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

export function useRemoveOrderItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId: string) => orderRepository.removeItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
