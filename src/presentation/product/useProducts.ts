import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SupabaseProductRepository } from '../../infrastructure/product/SupabaseProductRepository'
import type { ProductInput } from '../../application/product/ProductRepository'

export const productRepository = new SupabaseProductRepository()
const PAGE_SIZE = 10

export function useProductList(params: {
  storeId: string
  page: number
  pageSize?: number
  incompleteOnly?: boolean
}) {
  const pageSize = params.pageSize ?? PAGE_SIZE

  return useQuery({
    queryKey: ['products', { ...params, pageSize }],
    queryFn: () =>
      productRepository.list({
        storeId: params.storeId,
        page: params.page,
        pageSize,
        incompleteOnly: params.incompleteOnly,
      }),
    enabled: !!params.storeId,
  })
}

/** Busca produto ativo por nome, server-side (nunca "traz tudo e filtra no client") — pra picker de item/promoção. */
export function useProductSearch(storeId: string, query: string) {
  return useQuery({
    queryKey: ['products', 'search', storeId, query],
    queryFn: () => productRepository.searchActive(storeId, query),
    enabled: !!storeId,
  })
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', id],
    queryFn: () => productRepository.getById(id as string),
    enabled: !!id,
  })
}

export function useSaveProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, storeId, input }: { id?: string; storeId: string; input: ProductInput }) =>
      id ? productRepository.update(id, input) : productRepository.create(storeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => productRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

