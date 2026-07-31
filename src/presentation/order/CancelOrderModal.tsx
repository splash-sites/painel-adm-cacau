import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/Dialog'
import { buttonClass } from '../ui/styles'

export function CancelOrderModal({
  onConfirm,
  onClose,
  isPending,
}: {
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogTitle>Cancelar pedido</DialogTitle>
        <DialogDescription>
          Essa ação não pode ser desfeita. O pedido vai ser marcado como cancelado.
        </DialogDescription>
        <DialogFooter>
          <button type="button" onClick={onClose} className={buttonClass('outline')}>
            Voltar
          </button>
          <button type="button" onClick={onConfirm} disabled={isPending} className={buttonClass('danger')}>
            {isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
