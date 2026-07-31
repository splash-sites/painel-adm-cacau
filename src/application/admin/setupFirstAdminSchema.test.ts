import { describe, expect, it } from 'vitest'
import { setupFirstAdminSchema } from './setupFirstAdminSchema'

describe('setupFirstAdminSchema', () => {
  it('accepts valid input', () => {
    const result = setupFirstAdminSchema.safeParse({
      fullName: 'Fulano',
      email: 'a@b.com',
      password: '123456',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty fullName', () => {
    const result = setupFirstAdminSchema.safeParse({
      fullName: '',
      email: 'a@b.com',
      password: '123456',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = setupFirstAdminSchema.safeParse({
      fullName: 'Fulano',
      email: 'bad',
      password: '123456',
    })
    expect(result.success).toBe(false)
  })

  it('rejects short password', () => {
    const result = setupFirstAdminSchema.safeParse({
      fullName: 'Fulano',
      email: 'a@b.com',
      password: '123',
    })
    expect(result.success).toBe(false)
  })
})
