import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SupabaseProductRepository } from '../../infrastructure/product/SupabaseProductRepository'
import { buildProductsWorkbook } from '../../infrastructure/product/export/buildProductsWorkbook'
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

/** Baixa um .xlsx com todos os produtos da loja, no mesmo formato que a importação lê. */
export function useExportProducts() {
  return useMutation({
    mutationFn: async ({
      storeId,
      storeName,
      fileBase,
    }: {
      storeId: string
      storeName: string
      fileBase: string
    }): Promise<number> => {
      const products = await productRepository.listAll(storeId)
      const buffer = await buildProductsWorkbook(products, storeName)

      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${fileBase}.xlsx`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)

      return products.length
    },
  })
}

