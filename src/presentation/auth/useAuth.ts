import { useQuery } from '@tanstack/react-query'
import { SupabaseAuthRepository } from '../../infrastructure/auth/SupabaseAuthRepository'

export const authRepository = new SupabaseAuthRepository()
export const SESSION_QUERY_KEY = ['auth', 'session'] as const

/**
 * Hook só de leitura — a assinatura de onAuthStateChange mora em AuthSessionSync.tsx, montada
 * 1x em App.tsx. useAuth() pode ser chamado em quantos componentes precisar sem criar um novo
 * listener/refetch de profiles por chamada (bug real: eram 8 assinantes independentes).
 */
export function useAuth() {
  const { data: session, isLoading, refetch } = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => authRepository.getSession(),
    staleTime: Infinity,
  })

  return {
    session: session ?? null,
    isLoading,
    signIn: (email: string, password: string) => authRepository.signIn(email, password),
    signOut: () => authRepository.signOut(),
    refetchSession: refetch,
  }
}
