import { useAuth } from '../auth/useAuth'
import { useActiveStore } from './useActiveStore'

/** super_admin opera na "loja ativa" escolhida no seletor; store_admin fica preso à própria loja. */
export function useEffectiveStoreId(): string {
  const { session } = useAuth()
  const isSuperAdmin = session?.profile.role === 'super_admin'
  const { activeStoreId } = useActiveStore()
  return isSuperAdmin ? activeStoreId ?? '' : session?.profile.storeId ?? ''
}
