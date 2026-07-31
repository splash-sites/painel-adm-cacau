import { describe, expect, it } from 'vitest'
import { createStoreSchema, storeSchema } from './storeSchema'

function makeInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: 'Loja Centro',
    slug: 'loja-centro',
    active: true,
    supportsDineIn: true,
    supportsPickup: true,
    supportsDelivery: true,
    resellerEnabled: false,
    ...overrides,
  }
}

describe('storeSchema', () => {
  it('accepts a valid store', () => {
    expect(storeSchema.safeParse(makeInput()).success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(storeSchema.safeParse(makeInput({ name: '' })).success).toBe(false)
  })

  it('rejects slug with uppercase or spaces', () => {
    expect(storeSchema.safeParse(makeInput({ slug: 'Loja Centro' })).success).toBe(false)
  })

  it('rejects slug with leading/trailing hyphen', () => {
    expect(storeSchema.safeParse(makeInput({ slug: '-loja-centro-' })).success).toBe(false)
  })

  it('accepts slug with numbers and multiple hyphens', () => {
    expect(storeSchema.safeParse(makeInput({ slug: 'loja-2-centro' })).success).toBe(true)
  })

  it('accepts a store without whatsappNumber — optional on edit', () => {
    expect(storeSchema.safeParse(makeInput()).success).toBe(true)
  })
})

describe('createStoreSchema', () => {
  it('rejects a new store without whatsappNumber', () => {
    expect(createStoreSchema.safeParse(makeInput()).success).toBe(false)
  })

  it('rejects a whatsappNumber with too few digits', () => {
    expect(createStoreSchema.safeParse(makeInput({ whatsappNumber: '5551' })).success).toBe(false)
  })

  it('accepts a valid whatsappNumber, symbols included (stripped before checking length)', () => {
    expect(createStoreSchema.safeParse(makeInput({ whatsappNumber: '(51) 99999-8888' })).success).toBe(true)
  })
})
