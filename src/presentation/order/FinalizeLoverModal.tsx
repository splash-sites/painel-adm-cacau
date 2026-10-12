import { toast } from 'sonner'
import type { Order } from '../../domain/order/Order'
import { calculateOrderLoverTotal, calculateOrderRegularTotal } from '../../domain/order/orderPricing'
import { Button } from '../ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/Dialog'
import { formatCurrency } from './orderCardFormat'
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

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogTitle>Cliente é Cacau Lover?</DialogTitle>
        <DialogDescription>
          {orders.length > 1 ? `Vale pros ${orders.length} pedidos da mesa. ` : ''}A resposta define o valor do
          pedido nos Relatórios.
        </DialogDescription>

        <dl className="grid grid-cols-2 gap-3 font-body text-sm">
          <div className="rounded-lg border border-secondary/15 p-3">
            <dt className="text-foreground/60">Preço normal</dt>
            <dd className="text-lg font-semibold">{formatCurrency(regularTotal)}</dd>
          </div>
          <div className="rounded-lg border border-primary/40 p-3">
            <dt className="text-foreground/60">Cacau Lover</dt>
            <dd className="text-lg font-semibold text-secondary">{formatCurrency(loverTotal)}</dd>
          </div>
        </dl>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleAnswer(false)} disabled={finalize.isPending}>
            Não, preço normal
          </Button>
          <Button type="button" onClick={() => handleAnswer(true)} disabled={finalize.isPending}>
            {finalize.isPending ? 'Finalizando...' : 'Sim, é Lover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
