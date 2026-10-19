import { useState } from 'react'
import Cropper, { type Area, type MediaSize, type Point } from 'react-easy-crop'
import { toast } from 'sonner'
import { centerSquareOf } from '../../domain/product/imageCropPreview'
import { cropImageToBlob, PRODUCT_IMAGE_ASPECT } from './cropImageToBlob'
import { backgroundPreviewStyle } from './backgroundPreviewStyle'
import { Button } from '../ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/Dialog'

// Tamanho real da miniatura do cacau-cardapio (ProductThumb) — a prévia usa o mesmo valor de
// propósito, pra mostrar o recorte exatamente no tamanho que o cliente final vai ver.
const THUMB_PREVIEW_SIZE = 76
const DETAIL_PREVIEW_WIDTH = 168
const DETAIL_PREVIEW_HEIGHT = Math.round(DETAIL_PREVIEW_WIDTH / PRODUCT_IMAGE_ASPECT)

interface ImageCropModalProps {
  /** URL local (object URL de arquivo recém-escolhido) ou pública (foto já salva, "Ajustar recorte"). */
  src: string
  onClose: () => void
  onConfirm: (blob: Blob) => void
  isPending: boolean
}

/**
 * Recorte 4:3 (mesma proporção do cardápio, ver cropImageToBlob.ts) — usado tanto pra foto nova
 * quanto pra "Ajustar recorte" de uma foto já salva, sem precisar reenviar o arquivo do zero.
 */
export function ImageCropModal({ src, onClose, onConfirm, isPending }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [mediaSize, setMediaSize] = useState<MediaSize | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewsReady = croppedArea !== null && mediaSize !== null
  const detailPreviewStyle =
    previewsReady && croppedArea && mediaSize
      ? backgroundPreviewStyle(src, croppedArea, mediaSize, DETAIL_PREVIEW_WIDTH, DETAIL_PREVIEW_HEIGHT)
      : undefined
  const thumbPreviewStyle =
    previewsReady && croppedArea && mediaSize
      ? backgroundPreviewStyle(
          src,
          centerSquareOf(croppedArea),
          mediaSize,
          THUMB_PREVIEW_SIZE,
          THUMB_PREVIEW_SIZE,
        )
      : undefined

  async function handleConfirm() {
    if (!croppedArea) return
    setError(null)
    setIsProcessing(true)
    try {
      const blob = await cropImageToBlob(src, croppedArea)
      onConfirm(blob)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao recortar a imagem'
      setError(message)
      toast.error(message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isPending && !isProcessing && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>Ajustar foto</DialogTitle>
        <DialogDescription>
          Arraste e use o zoom pra enquadrar — esse recorte é o que fica salvo, nas proporções abaixo.
        </DialogDescription>

        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-canvas">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={PRODUCT_IMAGE_ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, areaPixels) => setCroppedArea(areaPixels)}
            onMediaLoaded={setMediaSize}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted">
            Prévia — não tem ajuste próprio, só mostra como o recorte de cima vai aparecer:
          </p>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="rounded-lg bg-canvas"
                style={{ width: DETAIL_PREVIEW_WIDTH, height: DETAIL_PREVIEW_HEIGHT, ...detailPreviewStyle }}
              />
              <span className="text-xs text-muted">No produto</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="rounded-[18px] bg-canvas"
                style={{ width: THUMB_PREVIEW_SIZE, height: THUMB_PREVIEW_SIZE, ...thumbPreviewStyle }}
              />
              <span className="text-xs text-muted">Na lista</span>
            </div>
            <p className="flex-1 text-xs text-muted">
              A miniatura da lista corta um pouco mais a lateral — normal, sem ajuste separado.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm font-body text-muted">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="flex-1"
            aria-label="Zoom da foto"
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending || isProcessing}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!croppedArea || isPending || isProcessing}>
            {isPending || isProcessing ? 'Salvando...' : 'Usar essa foto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
