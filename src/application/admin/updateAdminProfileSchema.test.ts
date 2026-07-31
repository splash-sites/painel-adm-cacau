import { describe, expect, it } from 'vitest'
import { updateAdminProfileSchema } from './updateAdminProfileSchema'

describe('updateAdminProfileSchema', () => {
  it('accepts valid input with password', () => {
    const result = updateAdminProfileSchema.safeParse({
      fullName: 'Fulano',
      email: 'a@b.com',
      password: '123456',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty password (keep unchanged)', () => {
    const result = updateAdminProfileSchema.safeParse({
      fullName: 'Fulano',
      email: 'a@b.com',
      password: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects short non-empty password', () => {
    const result = updateAdminProfileSchema.safeParse({
      fullName: 'Fulano',
      email: 'a@b.com',
      password: '123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty fullName', () => {
    const result = updateAdminProfileSchema.safeParse({ fullName: '', email: 'a@b.com', password: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = updateAdminProfileSchema.safeParse({ fullName: 'Fulano', email: 'bad', password: '' })
    expect(result.success).toBe(false)
  })
})
