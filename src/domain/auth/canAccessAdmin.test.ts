import { describe, expect, it } from 'vitest'
import { canAccessAdmin } from './canAccessAdmin'
import type { Profile } from './Profile'

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: '1',
    role: 'store_admin',
    storeId: 'store-1',
    fullName: 'Fulano',
    active: true,
    ...overrides,
  }
}

describe('canAccessAdmin', () => {
  it('allows active super_admin', () => {
    expect(canAccessAdmin(makeProfile({ role: 'super_admin' }))).toBe(true)
  })

  it('allows active store_admin', () => {
    expect(canAccessAdmin(makeProfile({ role: 'store_admin' }))).toBe(true)
  })

  it('denies customer role', () => {
    expect(canAccessAdmin(makeProfile({ role: 'customer' }))).toBe(false)
  })

  it('denies inactive profile regardless of role', () => {
    expect(canAccessAdmin(makeProfile({ role: 'super_admin', active: false }))).toBe(false)
  })
})
