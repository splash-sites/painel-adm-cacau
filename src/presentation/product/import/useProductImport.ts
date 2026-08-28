import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productRepository } from '../useProducts'
import { categoryRepository } from '../../category/useCategories'
import type { ImportPreviewRow } from '../../../domain/product/import/buildImportPreview'

/**
 * Estado atual dos produtos que a planilha referencia (por `external_code`) — base pra
 * decidir create vs update e pra não apagar coluna cuja célula veio vazia.
 */
export function useImportMergeSnapshot(storeId: string, externalCodes: string[]) {
  const sortedCodes = [...externalCodes].sort()
  return useQuery({
    queryKey: ['products', 'import-merge', storeId, sortedCodes],
    queryFn: () => productRepository.listForImportMerge(storeId, externalCodes),
    enabled: !!storeId && externalCodes.length > 0,
  })
}

export function useImportProducts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ storeId, rows }: { storeId: string; rows: ImportPreviewRow[] }) => {
      // Resolve o nome de categoria de cada linha pra um id, criando as que ainda não existem
      // (decisão de produto: import cria categoria automaticamente). Comparação sem caixa.
      // Usa o nome já resolvido (row.resolved.categoryName) — em atualização com célula vazia
      // isso é a categoria atual do produto, não null.
      const categories = await categoryRepository.list(storeId)
      const idByName = new Map(categories.map((category) => [category.name.trim().toLowerCase(), category.id]))

      const wantedNames = [
        ...new Set(
          rows
            .map((row) => row.resolved.categoryName)
            .filter((name): name is string => !!name),
        ),
      ]
      for (const name of wantedNames) {
        if (idByName.has(name.toLowerCase())) continue
        const created = await categoryRepository.create(storeId, { name, active: true })
        idByName.set(created.name.trim().toLowerCase(), created.id)
      }

      return productRepository.bulkUpsertFromImport(storeId, rows, idByName)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}
