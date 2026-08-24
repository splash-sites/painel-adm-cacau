import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SupabaseTableSessionRepository } from '../../infrastructure/order/SupabaseTableSessionRepository'

const tableSessionRepository = new SupabaseTableSessionRepository()

export function useOpenTableSessionIds(storeId: string) {
  return useQuery({
    queryKey: ['tableSessions', 'open', storeId],
    queryFn: () => tableSessionRepository.listOpenIds(storeId),
    enabled: !!storeId,
  })
}

export function useCloseTableSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => tableSessionRepository.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['tableSessions', 'open'] })
    },
  })
}
