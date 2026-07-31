import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SupabaseAdminUserRepository } from '../../infrastructure/admin/SupabaseAdminUserRepository'
import type {
  AdminUserProfileUpdateInput,
  AdminUserUpdateInput,
} from '../../application/admin/AdminUserRepository'

const adminUserRepository = new SupabaseAdminUserRepository()

export function useAdminUserList() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminUserRepository.list(),
  })
}

export function useAdminUser(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-users', 'detail', id],
    queryFn: () => adminUserRepository.getById(id as string),
    enabled: !!id,
  })
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminUserUpdateInput }) =>
      adminUserRepository.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

export function useUpdateAdminProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminUserProfileUpdateInput }) =>
      adminUserRepository.updateProfile(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminUserRepository.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

