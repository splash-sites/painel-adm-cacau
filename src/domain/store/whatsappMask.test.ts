import { describe, expect, it } from 'vitest'
import { maskWhatsapp } from './whatsappMask'

describe('maskWhatsapp', () => {
  it('formata celular completo com DDI e DDD', () => {
    expect(maskWhatsapp('5551999990001')).toBe('+55 (51) 99999-0001')
  })

  it('formata fixo com 8 dígitos depois do DDD', () => {
    expect(maskWhatsapp('555133334444')).toBe('+55 (51) 3333-4444')
  })

  it('vai montando enquanto a pessoa digita', () => {
    expect(maskWhatsapp('5')).toBe('+5')
    expect(maskWhatsapp('555')).toBe('+55 (5')
    expect(maskWhatsapp('55519')).toBe('+55 (51) 9')
    expect(maskWhatsapp('555199999')).toBe('+55 (51) 9999-9')
  })

  it('ignora o que não é número e corta no limite', () => {
    expect(maskWhatsapp('+55 (51) 99999-0001 ramal 2')).toBe('+55 (51) 99999-0001')
    expect(maskWhatsapp('')).toBe('')
    expect(maskWhatsapp('abc')).toBe('')
  })
})
