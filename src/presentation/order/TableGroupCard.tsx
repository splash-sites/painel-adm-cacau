import { useState } from 'react'
import { toast } from 'sonner'
import type { Order } from '../../domain/order/Order'
import { canRevert, getNextStatus, nextActionLabel } from '../../domain/order/orderStatusRules'
import { calculateOrderTotal, needsLoverQuestion } from '../../domain/order/orderPricing'
import { cn } from '../ui/cn'
import { buttonClass } from '../ui/styles'
import { FinalizeLoverModal } from './FinalizeLoverModal'
import { LoverTotalHint } from './LoverTotalHint'
import { OrderItemsList } from './OrderItemsList'
import { formatCpf, formatCurrency, formatName, formatPhone, whatsAppLink } from './orderCardFormat'
import { useChangeOrderStatus, useFinalizeOrders, useRevertOrderStatus } from './useOrders'

function handleError(error: unknown, fallback: string) {
  toast.error(error instanceof Error ? error.message : fallback)
}

/** 1 card só pra N pedidos "entregue" da mesma mesa — cada pessoa com seus itens/total, mais o total geral. */
export function TableGroupCard({ orders }: { orders: Order[] }) {
  const changeStatus = useChangeOrderStatus()
  const revertStatus = useRevertOrderStatus()
  const finalizeAll = useFinalizeOrders()
  // Pergunta do Lover aberta pra 1 pedido da mesa ou pra mesa inteira ("Finalizar mesa").
  const [loverQuestionFor, setLoverQuestionFor] = useState<Order[] | null>(null)
  const tableNumber = orders[0].tableNumber
  const grandTotal = orders.reduce((sum, order) => sum + calculateOrderTotal(order), 0)

  return (
    <article
      data-testid="table-group-card"
      className="flex flex-col gap-3 rounded-[20px] bg-surface p-4 font-body"
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-display text-[19px] font-bold leading-tight">Mesa {tableNumber}</span>
          <span className="text-[13px] text-muted">{orders.length} pedidos</span>
        </div>
        <span className="rounded-full bg-info-soft px-2.5 py-0.5 text-xs font-semibold text-info">Entregue</span>
      </header>

      <div className="divide-y divide-line">
        {orders.map((order) => {
          const nextStatus = getNextStatus(order.status, order.orderType)
          return (
            <div key={order.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
              <div>
                <span className="font-semibold">
                  {order.customerName ? formatName(order.customerName) : 'Não identificado'}
                </span>
                {order.customerCpf && (
                  <p className="text-xs text-muted">CPF {formatCpf(order.customerCpf)}</p>
                )}
                {order.customerPhone && (
                  <p className="text-xs text-muted">
                    <a
                      href={whatsAppLink(order)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-ink transition-colors"
                    >
                      {formatPhone(order.customerPhone)}
                    </a>
                  </p>
                )}
              </div>

              <OrderItemsList items={order.items} />

              <div className="space-y-2 pt-1">
                <div className="flex items-baseline justify-between gap-2 tabular-nums">
                  <span className="font-semibold">{formatCurrency(calculateOrderTotal(order))}</span>
                  <LoverTotalHint order={order} />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {canRevert(order.status) && (
                    <button
                      type="button"
                      onClick={() =>
                        revertStatus.mutate(order.id, {
                          onError: (error) => handleError(error, 'Falha ao voltar etapa'),
                        })
                      }
                      disabled={revertStatus.isPending}
                      className="whitespace-nowrap text-sm text-muted hover:text-ink"
                    >
                      Voltar etapa
                    </button>
                  )}
                  {nextStatus && (
                    <button
                      type="button"
                      onClick={() =>
                        needsLoverQuestion([order], nextStatus)
                          ? setLoverQuestionFor([order])
                          : changeStatus.mutate(
                              { orderId: order.id, newStatus: nextStatus },
                              { onError: (error) => handleError(error, 'Falha ao avançar etapa') },
                            )
                      }
                      disabled={changeStatus.isPending}
                      className={cn(buttonClass('primary'), 'min-h-9 whitespace-nowrap px-3 py-1.5 text-sm')}
                    >
                      {nextActionLabel(order.status, order.orderType)}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-3">
        <div className="flex items-baseline justify-between tabular-nums">
          <span className="text-[13px] text-muted">Total da mesa</span>
          <span className="text-lg font-semibold">{formatCurrency(grandTotal)}</span>
        </div>
        <button
          type="button"
          onClick={() =>
            needsLoverQuestion(orders, 'finalized')
              ? setLoverQuestionFor(orders)
              : finalizeAll.mutate(
                  { orderIds: orders.map((order) => order.id), isLover: null },
                  {
                    onSuccess: () => toast.success('Mesa finalizada.'),
                    onError: (error) => handleError(error, 'Falha ao finalizar mesa'),
                  },
                )
          }
          disabled={finalizeAll.isPending}
          className={`w-full ${buttonClass('primary')}`}
        >
          Finalizar mesa
        </button>
      </div>

      {loverQuestionFor && (
        <FinalizeLoverModal
          orders={loverQuestionFor}
          onClose={() => setLoverQuestionFor(null)}
          onFinalized={() => loverQuestionFor.length > 1 && toast.success('Mesa finalizada.')}
        />
      )}
    </article>
  )
}
