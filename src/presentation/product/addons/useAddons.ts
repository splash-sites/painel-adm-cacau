import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SupabaseAddonRepository } from '../../../infrastructure/product/SupabaseAddonRepository'
import type {
  AddonGroupInput,
  AddonOptionInput,
  ProductAddonGroupInput,
} from '../../../application/product/AddonRepository'
import type { AddonGroup } from '../../../domain/product/Addon'

export const addonRepository = new SupabaseAddonRepository()

export function useAddonGroupList(storeId: string) {
  return useQuery({
    queryKey: ['addon-groups', storeId],
    queryFn: () => addonRepository.listGroups(storeId),
    enabled: !!storeId,
  })
}

export function useSaveAddonGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      storeId,
      input,
    }: {
      id?: string
      storeId: string
      input: AddonGroupInput
    }): Promise<AddonGroup | undefined> => {
      if (id) {
        await addonRepository.updateGroup(id, input)
        return undefined
      }
      return addonRepository.createGroup(storeId, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-groups'] })
    },
  })
}

export function useDeleteAddonGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => addonRepository.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-groups'] })
    },
  })
}

export function useAddonOptionList(groupId: string) {
  return useQuery({
    queryKey: ['addon-options', groupId],
    queryFn: () => addonRepository.listOptions(groupId),
    enabled: !!groupId,
  })
}

export function useSaveAddonOption() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, groupId, input }: { id?: string; groupId: string; input: AddonOptionInput }) => {
      if (id) {
        await addonRepository.updateOption(id, input)
        return
      }
      await addonRepository.createOption(groupId, input)
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['addon-options', groupId] })
    },
  })
}

export function useDeleteAddonOption() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id }: { id: string; groupId: string }) => addonRepository.deleteOption(id),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['addon-options', groupId] })
    },
  })
}

export function useProductAddonGroupList(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-addon-groups', productId],
    queryFn: () => addonRepository.listProductAddonGroups(productId as string),
    enabled: !!productId,
  })
}

export function useLinkAddonGroupToProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      productId,
      addonGroupId,
      input,
    }: {
      productId: string
      addonGroupId: string
      input: ProductAddonGroupInput
    }) => addonRepository.linkGroupToProduct(productId, addonGroupId, input),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product-addon-groups', productId] })
    },
  })
}

export function useUnlinkAddonGroupFromProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, addonGroupId }: { productId: string; addonGroupId: string }) =>
      addonRepository.unlinkGroupFromProduct(productId, addonGroupId),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product-addon-groups', productId] })
    },
  })
}

export function useReorderProductAddonGroups() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, orderedAddonGroupIds }: { productId: string; orderedAddonGroupIds: string[] }) =>
      addonRepository.reorderProductAddonGroups(productId, orderedAddonGroupIds),
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['product-addon-groups', productId] })
    },
  })
}
