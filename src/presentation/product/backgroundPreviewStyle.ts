import type { CSSProperties } from 'react'
import type { Area, MediaSize } from 'react-easy-crop'
import type { PixelArea } from '../../domain/product/imageCropPreview'

/**
 * Monta o CSS de `background-image` que mostra, numa caixa de `boxWidth`×`boxHeight` px, exatamente
 * o recorte `area` (em pixels naturais da imagem, mesmo espaço de `croppedAreaPixels` do
 * react-easy-crop) — sem recriar canvas a cada frame, só matemática de posição/tamanho de fundo.
 * `area` não precisa ter a mesma proporção da caixa (ex: caixa quadrada mostrando um recorte 4:3
 * recebe só o quadrado central, resolvido antes por `centerSquareOf`).
 */
export function backgroundPreviewStyle(
  src: string,
  area: Area | PixelArea,
  media: MediaSize,
  boxWidth: number,
  boxHeight: number,
): CSSProperties {
  const scale = Math.max(boxWidth / area.width, boxHeight / area.height)
  return {
    backgroundImage: `url(${src})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${media.naturalWidth * scale}px ${media.naturalHeight * scale}px`,
    backgroundPosition: `${-area.x * scale}px ${-area.y * scale}px`,
  }
}
