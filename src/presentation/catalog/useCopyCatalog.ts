import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SupabaseCatalogCopyRepository } from '../../infrastructure/catalog/SupabaseCatalogCopyRepository'
import type { CopyCatalogParams } from '../../application/catalog/CatalogCopyRepository'

const catalogCopyRepository = new SupabaseCatalogCopyRepository()

export function useCopyCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: CopyCatalogParams) => catalogCopyRepository.copy(params),
    onSuccess: (_result, params) => {
      if (params.dryRun) return // prévia não grava nada
      // o destino ganhou produtos/categorias/adicionais/variações novos
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['addonGroups'] })
      queryClient.invalidateQueries({ queryKey: ['variationGroups'] })
    },
  })
}
