import { toast } from 'sonner'
import type { Order } from '../../domain/order/Order'
import { calculateOrderLoverTotal, calculateOrderRegularTotal } from '../../domain/order/orderPricing'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/Dialog'
import { formatCurrency, formatName } from './orderCardFormat'
import { useFinalizeOrders } from './useOrders'

/** Pergunta ao finalizar (1 pedido ou a mesa inteira): a resposta decide o preço que vale nos Relatórios. */
export function FinalizeLoverModal({
  orders,
  onClose,
  onFinalized,
}: {
  orders: Order[]
  onClose: () => void
  onFinalized?: () => void
}) {
  const finalize = useFinalizeOrders()
  const regularTotal = orders.reduce((sum, order) => sum + calculateOrderRegularTotal(order), 0)
  const loverTotal = orders.reduce((sum, order) => sum + calculateOrderLoverTotal(order), 0)

  function handleAnswer(isLover: boolean) {
    finalize.mutate(
      { orderIds: orders.map((order) => order.id), isLover },
      {
        onSuccess: () => {
          onFinalized?.()
          onClose()
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : 'Falha ao finalizar'),
      },
    )
  }

  const who =
    orders.length > 1
      ? `Vale para os ${orders.length} pedidos da mesa.`
      : orders[0]?.customerName
        ? `Finalizando o pedido de ${formatName(orders[0].customerName)}.`
        : ''

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[440px]">
        <div className="flex flex-col gap-1">
          <DialogTitle>Cliente é lover?</DialogTitle>
          <DialogDescription>
            {who} A resposta define o valor nos relatórios.
          </DialogDescription>
        </div>

        <div className="grid grid-cols-2 gap-2.5 tabular-nums">
          <button
            type="button"
            onClick={() => handleAnswer(false)}
            disabled={finalize.isPending}
            className="flex flex-col gap-1 rounded-2xl border-[1.5px] border-line-strong bg-surface p-4 text-left transition-colors hover:bg-canvas disabled:opacity-50"
          >
            <span className="text-sm text-muted">Não, preço normal</span>
            <span className="text-2xl font-semibold">{formatCurrency(regularTotal)}</span>
          </button>
          <button
            type="button"
            onClick={() => handleAnswer(true)}
            disabled={finalize.isPending}
            className="flex flex-col gap-1 rounded-2xl bg-ink p-4 text-left text-white transition-colors hover:bg-[#3d2820] disabled:opacity-50"
          >
            <span className="text-sm text-caramel">Sim é lover</span>
            <span className="text-2xl font-semibold">{formatCurrency(loverTotal)}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="self-start text-sm font-semibold text-lover hover:underline"
        >
          Voltar sem finalizar
        </button>
      </DialogContent>
    </Dialog>
  )
}
