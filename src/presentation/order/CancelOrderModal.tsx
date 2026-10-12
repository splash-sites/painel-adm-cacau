import { useId, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/Dialog'
import { Textarea } from '../ui/Textarea'
import { buttonClass } from '../ui/styles'

const QUICK_REASONS = ['Item em falta', 'Cliente desistiu', 'Pedido duplicado'] as const
const OTHER = 'Outro'

/** Junta o motivo rápido com o detalhe: "Item em falta: acabou o morango". "Outro" vale só pelo detalhe. */
function buildReason(choice: string | null, detail: string): string {
  const trimmedDetail = detail.trim()
  if (!choice || choice === OTHER) return trimmedDetail
  return trimmedDetail ? `${choice}: ${trimmedDetail}` : choice
}

export function CancelOrderModal({
  customerName,
  onConfirm,
  onClose,
  isPending,
}: {
  customerName?: string | null
  onConfirm: (reason: string) => void
  onClose: () => void
  isPending: boolean
}) {
  const [choice, setChoice] = useState<string | null>(null)
  const [detail, setDetail] = useState('')
  const detailId = useId()
  const reason = buildReason(choice, detail)
  const needsDetail = choice === null || choice === OTHER

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[440px]">
        <div className="flex flex-col gap-1">
          <DialogTitle>{customerName ? `Cancelar o pedido de ${customerName}?` : 'Cancelar pedido?'}</DialogTitle>
          <DialogDescription>O cliente vê o pedido como cancelado. Não dá para desfazer.</DialogDescription>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm text-muted">Motivo</legend>
          <div className="flex flex-wrap gap-2">
            {[...QUICK_REASONS, OTHER].map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={choice === option}
                onClick={() => setChoice(choice === option ? null : option)}
                className={`rounded-full border-[1.5px] px-3.5 py-2 text-sm transition-colors ${
                  choice === option ? 'border-ink bg-chosen font-semibold' : 'border-line-strong hover:bg-canvas'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={detailId} className="text-sm text-muted">
            {needsDetail ? 'Motivo do cancelamento' : 'Detalhe, se quiser'}
          </label>
          <Textarea
            id={detailId}
            rows={3}
            className="resize-none"
            placeholder={needsDetail ? 'Escolha um motivo acima ou escreva aqui' : 'Ex: acabou o morango do fondue'}
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
          />
        </div>

        <DialogFooter>
          <button type="button" onClick={onClose} className={buttonClass('outline')}>
            Voltar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={isPending || reason === ''}
            className={buttonClass('danger')}
          >
            {isPending ? 'Cancelando...' : 'Cancelar pedido'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
