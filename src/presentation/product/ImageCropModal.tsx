import { useState } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import { toast } from 'sonner'
import { cropImageToBlob, PRODUCT_IMAGE_ASPECT } from './cropImageToBlob'
import { Button } from '../ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/Dialog'

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
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          Arraste e use o zoom pra enquadrar — essa é a área que aparece em todo o cardápio.
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
          />
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
