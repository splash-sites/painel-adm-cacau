import { describe, expect, it } from 'vitest'
import { centerSquareOf } from './imageCropPreview'

describe('centerSquareOf', () => {
  it('corta simétrico nos lados quando a área é mais larga que alta (4:3)', () => {
    const square = centerSquareOf({ x: 0, y: 0, width: 400, height: 300 })
    expect(square).toEqual({ x: 50, y: 0, width: 300, height: 300 })
  })

  it('corta simétrico em cima/baixo quando a área é mais alta que larga', () => {
    const square = centerSquareOf({ x: 0, y: 0, width: 300, height: 400 })
    expect(square).toEqual({ x: 0, y: 50, width: 300, height: 300 })
  })

  it('mantém a área igual quando já é quadrada', () => {
    const square = centerSquareOf({ x: 10, y: 20, width: 200, height: 200 })
    expect(square).toEqual({ x: 10, y: 20, width: 200, height: 200 })
  })

  it('soma o offset x/y original da área, não ignora', () => {
    const square = centerSquareOf({ x: 100, y: 50, width: 400, height: 300 })
    expect(square).toEqual({ x: 150, y: 50, width: 300, height: 300 })
  })
})
