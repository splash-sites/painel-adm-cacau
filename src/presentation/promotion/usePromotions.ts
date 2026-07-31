import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SupabasePromotionRepository } from '../../infrastructure/promotion/SupabasePromotionRepository'
import type { PromotionInput } from '../../application/promotion/PromotionRepository'

export const promotionRepository = new SupabasePromotionRepository()

export function usePromotionList(storeId: string) {
  return useQuery({
    queryKey: ['promotions', storeId],
    queryFn: () => promotionRepository.list(storeId),
    enabled: !!storeId,
  })
}

export function useSavePromotion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, storeId, input }: { id?: string; storeId: string; input: PromotionInput }) => {
      if (id) {
        await promotionRepository.update(id, input)
        return
      }
      await promotionRepository.create(storeId, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] })
    },
  })
}

export function useDeletePromotion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => promotionRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] })
    },
  })
}

export function useReorderPromotions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ storeId, orderedIds }: { storeId: string; orderedIds: string[] }) =>
      promotionRepository.reorder(storeId, orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] })
    },
  })
}
