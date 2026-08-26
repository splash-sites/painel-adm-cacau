import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SupabasePromotionRepository } from '../../infrastructure/promotion/SupabasePromotionRepository'
import type { PromotionComboItemInput, PromotionInput } from '../../application/promotion/PromotionRepository'

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
    mutationFn: ({ id, storeId, input }: { id?: string; storeId: string; input: PromotionInput }) =>
      id ? promotionRepository.update(id, input) : promotionRepository.create(storeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] })
    },
  })
}

/** Passo separado do useSavePromotion de propósito — ver saveComboItems no repository. */
export function useSaveComboItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ promotionId, items }: { promotionId: string; items: PromotionComboItemInput[] }) =>
      promotionRepository.saveComboItems(promotionId, items),
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
