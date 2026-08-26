import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SupabaseCategoryRepository } from '../../infrastructure/category/SupabaseCategoryRepository'
import type { CategoryInput } from '../../application/category/CategoryRepository'
import type { Category } from '../../domain/category/Category'

export const categoryRepository = new SupabaseCategoryRepository()

export function useCategoryList(storeId: string) {
  return useQuery({
    queryKey: ['categories', storeId],
    queryFn: () => categoryRepository.list(storeId),
    enabled: !!storeId,
  })
}

export function useSaveCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      storeId,
      input,
    }: {
      id?: string
      storeId: string
      input: CategoryInput
    }): Promise<Category | undefined> => {
      if (id) {
        await categoryRepository.update(id, input)
        return undefined
      }
      return categoryRepository.create(storeId, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => categoryRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}
