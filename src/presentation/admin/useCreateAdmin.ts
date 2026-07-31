import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SupabaseAdminRepository } from '../../infrastructure/admin/SupabaseAdminRepository'
import type { CreateAdminPayload, SetupFirstAdminPayload } from '../../application/admin/AdminRepository'

const adminRepository = new SupabaseAdminRepository()

export function useCreateAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateAdminPayload) => adminRepository.createAdmin(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

export function useSetupFirstAdmin() {
  return useMutation({
    mutationFn: (payload: SetupFirstAdminPayload) => adminRepository.setupFirstAdmin(payload),
  })
}
