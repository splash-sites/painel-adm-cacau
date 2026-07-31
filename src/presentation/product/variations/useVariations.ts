import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SupabaseVariationRepository } from '../../../infrastructure/product/SupabaseVariationRepository'
import type { VariationGroupInput, VariationOptionInput } from '../../../application/product/VariationRepository'
import type { VariationGroup } from '../../../domain/product/Variation'

export const variationRepository = new SupabaseVariationRepository()

export function useVariationGroupList(storeId: string) {
  return useQuery({
    queryKey: ['variation-groups', storeId],
    queryFn: () => variationRepository.listGroups(storeId),
    enabled: !!storeId,
  })
}

export function useSaveVariationGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      storeId,
      input,
    }: {
      id?: string
      storeId: string
      input: VariationGroupInput
    }): Promise<VariationGroup | undefined> => {
      if (id) {
        await variationRepository.updateGroup(id, input)
        return undefined
      }
      return variationRepository.createGroup(storeId, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variation-groups'] })
    },
  })
}

export function useDeleteVariationGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => variationRepository.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variation-groups'] })
    },
  })
}

export function useVariationOptionList(groupId: string) {
  return useQuery({
    queryKey: ['variation-options', groupId],
    queryFn: () => variationRepository.listOptions(groupId),
    enabled: !!groupId,
  })
}

export function useSaveVariationOption() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, groupId, input }: { id?: string; groupId: string; input: VariationOptionInput }) => {
      if (id) {
        await variationRepository.updateOption(id, input)
        return
      }
      await variationRepository.createOption(groupId, input)
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['variation-options', groupId] })
    },
  })
}

export function useDeleteVariationOption() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: string; groupId: string }) => variationRepository.deleteOption(id),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['variation-options', groupId] })
    },
  })
}

export function useProductVariationGroupList(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-variation-groups', productId],
    queryFn: () => variationRepository.listProductVariationGroups(productId as string),
    enabled: !!productId,
  })
}

export function useLinkVariationGroupToProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, variationGroupId }: { productId: string; variationGroupId: string }) =>
      variationRepository.linkGroupToProduct(productId, variationGroupId),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product-variation-groups', productId] })
    },
  })
}

export function useUnlinkVariationGroupFromProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, variationGroupId }: { productId: string; variationGroupId: string }) =>
      variationRepository.unlinkGroupFromProduct(productId, variationGroupId),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product-variation-groups', productId] })
    },
  })
}

export function useReorderProductVariationGroups() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, orderedVariationGroupIds }: { productId: string; orderedVariationGroupIds: string[] }) =>
      variationRepository.reorderProductVariationGroups(productId, orderedVariationGroupIds),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product-variation-groups', productId] })
    },
  })
}
