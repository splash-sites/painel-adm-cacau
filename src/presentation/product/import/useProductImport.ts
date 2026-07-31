import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productRepository } from '../useProducts'
import type { ImportPreviewRow } from '../../../domain/product/import/buildImportPreview'

export function useExistingExternalCodes(storeId: string) {
  return useQuery({
    queryKey: ['products', 'external-codes', storeId],
    queryFn: () => productRepository.listExternalCodes(storeId),
    enabled: !!storeId,
  })
}

export function useImportProducts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ storeId, rows }: { storeId: string; rows: ImportPreviewRow[] }) =>
      productRepository.bulkUpsertFromImport(storeId, rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
