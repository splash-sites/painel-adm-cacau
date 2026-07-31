import type { Profile } from '../../domain/auth/Profile'

export interface AuthSession {
  userId: string
  email: string
  profile: Profile
}

export interface AuthRepository {
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  getSession(): Promise<AuthSession | null>
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void
}
