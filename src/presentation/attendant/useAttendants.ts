import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SupabaseAttendantRepository } from '../../infrastructure/attendant/SupabaseAttendantRepository'
import type { AttendantInput } from '../../application/attendant/AttendantRepository'
import type { Attendant } from '../../domain/attendant/Attendant'

export const attendantRepository = new SupabaseAttendantRepository()

export function useAttendantList(storeId: string) {
  return useQuery({
    queryKey: ['attendants', storeId],
    queryFn: () => attendantRepository.list(storeId),
    enabled: !!storeId,
  })
}

export function useSaveAttendant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      storeId,
      input,
    }: {
      id?: string
      storeId: string
      input: AttendantInput
    }): Promise<Attendant | undefined> => {
      if (id) {
        await attendantRepository.update(id, input)
        return undefined
      }
      return attendantRepository.create(storeId, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendants'] })
    },
  })
}

export function useDeleteAttendant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => attendantRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendants'] })
    },
  })
}
