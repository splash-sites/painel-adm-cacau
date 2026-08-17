import { useId, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/Dialog'
import { Label } from '../ui/Label'
import { Textarea } from '../ui/Textarea'
import { buttonClass } from '../ui/styles'

export function CancelOrderModal({
  onConfirm,
  onClose,
  isPending,
}: {
  onConfirm: (reason: string) => void
  onClose: () => void
  isPending: boolean
}) {
  const [reason, setReason] = useState('')
  const reasonId = useId()
  const trimmedReason = reason.trim()

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogTitle>Cancelar pedido</DialogTitle>
        <DialogDescription>
          Essa ação não pode ser desfeita. O pedido vai ser marcado como cancelado.
        </DialogDescription>

        <div className="space-y-1">
          <Label htmlFor={reasonId}>Motivo do cancelamento</Label>
          <Textarea
            id={reasonId}
            rows={3}
            placeholder="Ex: cliente desistiu, item em falta, endereço incorreto..."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            autoFocus
          />
        </div>

        <DialogFooter>
          <button type="button" onClick={onClose} className={buttonClass('outline')}>
            Voltar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(trimmedReason)}
            disabled={isPending || trimmedReason === ''}
            className={buttonClass('danger')}
          >
            {isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
