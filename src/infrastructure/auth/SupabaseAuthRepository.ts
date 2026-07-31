import { supabase } from '../supabase/client'
import type { AuthRepository, AuthSession } from '../../application/auth/AuthRepository'
import type { Profile, Role } from '../../domain/auth/Profile'

interface ProfileRow {
  id: string
  role: Role
  store_id: string | null
  full_name: string | null
  active: boolean
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    role: row.role,
    storeId: row.store_id,
    fullName: row.full_name,
    active: row.active,
  }
}

async function fetchSessionForUser(userId: string, email: string | undefined): Promise<AuthSession | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, store_id, full_name, active')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  return { userId, email: email ?? '', profile: toProfile(data as ProfileRow) }
}

export class SupabaseAuthRepository implements AuthRepository {
  async signIn(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  }

  async getSession(): Promise<AuthSession | null> {
    const { data } = await supabase.auth.getSession()
    const userId = data.session?.user.id
    if (!userId) return null
    return fetchSessionForUser(userId, data.session?.user.email)
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id
      if (!userId) {
        callback(null)
        return
      }
      fetchSessionForUser(userId, session?.user.email).then(callback)
    })

    return () => data.subscription.unsubscribe()
  }
}
