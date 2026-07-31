import type { Profile } from './Profile'

export function canAccessAdmin(profile: Profile): boolean {
  return profile.active && (profile.role === 'super_admin' || profile.role === 'store_admin')
}
