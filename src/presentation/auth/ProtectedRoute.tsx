import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { canAccessAdmin } from '../../domain/auth/canAccessAdmin'
import type { Role } from '../../domain/auth/Profile'
import { useAuth } from './useAuth'

export function ProtectedRoute({
  children,
  requireRole,
}: {
  children: ReactNode
  requireRole?: Role
}) {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface text-ink">
        Carregando...
      </div>
    )
  }

  if (!session || !canAccessAdmin(session.profile)) {
    return <Navigate to="/login" replace />
  }

  if (requireRole && session.profile.role !== requireRole) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
