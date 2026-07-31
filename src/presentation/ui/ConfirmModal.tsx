import { Button, type ButtonProps } from './Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from './Dialog'

export function ConfirmModal({
  title,
  description,
  confirmLabel,
  pendingLabel,
  confirmVariant = 'primary',
  onConfirm,
  onClose,
  isPending,
}: {
  title: string
  description: string
  confirmLabel: string
  pendingLabel: string
  confirmVariant?: ButtonProps['variant']
  onConfirm: () => void
  onClose: () => void
  isPending: boolean
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
          <Button variant={confirmVariant ?? 'primary'} onClick={onConfirm} disabled={isPending}>
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
