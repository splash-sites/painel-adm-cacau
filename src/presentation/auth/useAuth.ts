import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { SupabaseAuthRepository } from '../../infrastructure/auth/SupabaseAuthRepository'
import type { AuthSession } from '../../application/auth/AuthRepository'

const authRepository = new SupabaseAuthRepository()
const SESSION_QUERY_KEY = ['auth', 'session'] as const

export function useAuth() {
  const queryClient = useQueryClient()

  const { data: session, isLoading, refetch } = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => authRepository.getSession(),
    staleTime: Infinity,
  })

  useEffect(() => {
    return authRepository.onAuthStateChange((nextSession) => {
      queryClient.setQueryData<AuthSession | null>(SESSION_QUERY_KEY, nextSession)
    })
  }, [queryClient])

  return {
    session: session ?? null,
    isLoading,
    signIn: (email: string, password: string) => authRepository.signIn(email, password),
    signOut: () => authRepository.signOut(),
    refetchSession: refetch,
  }
}
