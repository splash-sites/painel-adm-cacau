import { describe, expect, it } from 'vitest'
import { buildTableMenuUrl, tableNumberRange } from './tableQrUrl'

describe('buildTableMenuUrl', () => {
  it('appends the table as a path segment', () => {
    expect(buildTableMenuUrl('https://pedido.splashpedidos.com', 'cacaushow-torres', '7')).toBe(
      'https://pedido.splashpedidos.com/cacaushow-torres/mesa/7',
    )
  })

  it('strips a trailing slash from the storefront url', () => {
    expect(buildTableMenuUrl('https://pedido.splashpedidos.com/', 'cacaushow-torres', '7')).toBe(
      'https://pedido.splashpedidos.com/cacaushow-torres/mesa/7',
    )
  })

  it('encodes a non-numeric table label', () => {
    expect(buildTableMenuUrl('https://x.com', 'loja', 'Varanda 2')).toBe(
      'https://x.com/loja/mesa/Varanda%202',
    )
  })
})

describe('tableNumberRange', () => {
  it('builds an inclusive sequential range', () => {
    expect(tableNumberRange(1, 5)).toEqual(['1', '2', '3', '4', '5'])
  })

  it('returns empty for an invalid range', () => {
    expect(tableNumberRange(5, 1)).toEqual([])
    expect(tableNumberRange(0, 3)).toEqual([])
    expect(tableNumberRange(1.5, 3)).toEqual([])
  })
})
