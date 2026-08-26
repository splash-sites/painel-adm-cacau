import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { AuthSession } from '../../application/auth/AuthRepository'
import { authRepository, SESSION_QUERY_KEY } from './useAuth'

/**
 * Único assinante de onAuthStateChange do app inteiro — montado 1x em App.tsx, fora de
 * qualquer rota. Antes, cada chamada de useAuth() criava seu próprio listener (8 componentes
 * chamavam useAuth() simultaneamente), então todo evento de auth disparava 8 fetches
 * independentes de profiles e uma cascata de re-render que fazia queries dependentes de
 * useEffectiveStoreId (ex: Relatórios) refazer o fetch várias vezes por causa do enabled
 * oscilando enquanto os 8 fetches resolviam em momentos diferentes.
 */
export function AuthSessionSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    return authRepository.onAuthStateChange((nextSession) => {
      queryClient.setQueryData<AuthSession | null>(SESSION_QUERY_KEY, nextSession)
    })
  }, [queryClient])

  return null
}
