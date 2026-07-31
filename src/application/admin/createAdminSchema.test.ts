import { describe, expect, it } from 'vitest'
import { createAdminSchema } from './createAdminSchema'

function makeInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    fullName: 'Fulano de Tal',
    email: 'a@b.com',
    password: '123456',
    role: 'store_admin',
    storeId: 'store-1',
    ...overrides,
  }
}

describe('createAdminSchema', () => {
  it('accepts a valid store_admin with storeId', () => {
    expect(createAdminSchema.safeParse(makeInput()).success).toBe(true)
  })

  it('accepts a valid super_admin without storeId', () => {
    const result = createAdminSchema.safeParse(
      makeInput({ role: 'super_admin', storeId: undefined }),
    )
    expect(result.success).toBe(true)
  })

  it('rejects store_admin without storeId', () => {
    const result = createAdminSchema.safeParse(makeInput({ storeId: undefined }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['storeId'])
    }
  })

  it('rejects invalid email', () => {
    expect(createAdminSchema.safeParse(makeInput({ email: 'bad' })).success).toBe(false)
  })

  it('rejects short password', () => {
    expect(createAdminSchema.safeParse(makeInput({ password: '123' })).success).toBe(false)
  })

  it('rejects unknown role', () => {
    expect(createAdminSchema.safeParse(makeInput({ role: 'customer' })).success).toBe(false)
  })
})
