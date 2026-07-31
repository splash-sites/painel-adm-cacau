import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SupabaseStoreRepository } from '../../infrastructure/store/SupabaseStoreRepository'
import type { StoreInput } from '../../application/store/StoreRepository'

const storeRepository = new SupabaseStoreRepository()
const PAGE_SIZE = 20

/** Percorre todas as páginas de verdade — usado em seletor/lookup que não pode truncar silenciosamente (ver #5 do audit). */
export function useAllStores() {
  return useQuery({
    queryKey: ['stores', 'all'],
    queryFn: async () => {
      const first = await storeRepository.list({ page: 0, pageSize: PAGE_SIZE })
      const items = [...first.items]
      const totalPages = Math.ceil(first.total / PAGE_SIZE)
      for (let page = 1; page < totalPages; page++) {
        const next = await storeRepository.list({ page, pageSize: PAGE_SIZE })
        items.push(...next.items)
      }
      return items
    },
  })
}

export function useStore(id: string | undefined) {
  return useQuery({
    queryKey: ['stores', 'detail', id],
    queryFn: () => storeRepository.getById(id as string),
    enabled: !!id,
  })
}

export function useSaveStore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: StoreInput }) =>
      id ? storeRepository.update(id, input) : storeRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}

export function useDeleteStore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => storeRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}
