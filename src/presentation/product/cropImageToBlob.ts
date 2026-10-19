import type { Area } from 'react-easy-crop'

/** Proporção padrão da foto de produto — mesma do cardápio (ProductDetailModal usa aspect-[4/3]). */
export const PRODUCT_IMAGE_ASPECT = 4 / 3

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Supabase Storage (bucket público) manda Access-Control-Allow-Origin: * — sem isso o
    // canvas fica "tainted" e toBlob() nunca exporta (silencioso em alguns browsers).
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem pra recortar'))
    img.src = src
  })
}

// Teto de saída — foto de celular moderna facilmente teria 3000-4000px no lado maior; sem isso o
// canvas (e o upload) ficariam enormes à toa. 1600px já é mais que suficiente pro cardápio/painel.
const MAX_OUTPUT_WIDTH = 1600

/**
 * Recorta `src` (URL local de objeto, ou URL pública de foto já salva) na área escolhida pelo
 * usuário no <Cropper>, devolvendo um Blob JPEG pronto pra subir. Pixels em `area` já vêm na
 * escala da imagem original (react-easy-crop faz essa conta em onCropComplete). Saída nunca
 * passa de MAX_OUTPUT_WIDTH, mesmo que a foto original seja muito maior.
 */
export async function cropImageToBlob(src: string, area: Area): Promise<Blob> {
  const image = await loadImage(src)
  const scale = Math.min(1, MAX_OUTPUT_WIDTH / area.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(area.width * scale)
  canvas.height = Math.round(area.height * scale)

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas não suportado nesse navegador')

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem recortada'))),
      'image/jpeg',
      0.9,
    )
  })
}
