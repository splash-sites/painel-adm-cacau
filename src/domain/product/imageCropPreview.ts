export interface PixelArea {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Maior quadrado central dentro de `area` — mesmo recorte que `object-cover` faz numa caixa 1:1
 * (corta simétrico no lado maior, mantém o lado menor inteiro). Usado pra prever como a miniatura
 * quadrada (painel e lista do `cacau-cardapio`, ambas 1:1) vai cortar a foto já recortada em 4:3.
 */
export function centerSquareOf(area: PixelArea): PixelArea {
  const side = Math.min(area.width, area.height)
  return {
    x: area.x + (area.width - side) / 2,
    y: area.y + (area.height - side) / 2,
    width: side,
    height: side,
  }
}
