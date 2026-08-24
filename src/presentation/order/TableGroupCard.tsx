import { toast } from 'sonner'
import type { Order } from '../../domain/order/Order'
import { canRevert, getNextStatus } from '../../domain/order/orderStatusRules'
import { calculateOrderTotal } from '../../domain/order/orderPricing'
import { cn } from '../ui/cn'
import { buttonClass } from '../ui/styles'
import { OrderItemsList } from './OrderItemsList'
import { formatCpf, formatCurrency, formatName, formatPhone, whatsAppLink } from './orderCardFormat'
import { useChangeOrderStatus, useFinalizeTableOrders, useRevertOrderStatus } from './useOrders'

function handleError(error: unknown, fallback: string) {
  toast.error(error instanceof Error ? error.message : fallback)
}

/** 1 card só pra N pedidos "entregue" da mesma mesa — cada pessoa com seus itens/total, mais o total geral. */
export function TableGroupCard({ orders }: { orders: Order[] }) {
  const changeStatus = useChangeOrderStatus()
  const revertStatus = useRevertOrderStatus()
  const finalizeAll = useFinalizeTableOrders()
  const tableNumber = orders[0].tableNumber
  const grandTotal = orders.reduce((sum, order) => sum + calculateOrderTotal(order), 0)

  return (
    <div
      data-testid="table-group-card"
      className="flex flex-col rounded-xl border border-secondary/15 bg-background font-body shadow-sm overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 py-2 bg-blue-50 text-blue-800">
        <span className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
          <span className="h-2 w-2 rounded-full shrink-0 bg-blue-500" />
          Entregue
        </span>
        <span className="text-xs">
          Mesa {tableNumber} · {orders.length} pedidos
        </span>
      </div>

      <div className="divide-y divide-secondary/10 p-4">
        {orders.map((order) => {
          const nextStatus = getNextStatus(order.status, order.orderType)
          return (
            <div key={order.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
              <div>
                <span className="font-medium">
                  {order.customerName ? formatName(order.customerName) : 'Não identificado'}
                </span>
                {order.customerCpf && (
                  <p className="text-xs text-foreground/60">CPF {formatCpf(order.customerCpf)}</p>
                )}
                {order.customerPhone && (
                  <p className="text-xs text-foreground/60">
                    <a
                      href={whatsAppLink(order)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#25D366] transition-colors"
                    >
                      {formatPhone(order.customerPhone)}
                    </a>
                  </p>
                )}
              </div>

              <OrderItemsList items={order.items} />

              <div className="space-y-2 pt-1">
                <div>
                  <span className="block text-xs font-medium uppercase tracking-wide text-foreground/50">
                    Subtotal
                  </span>
                  <span className="font-semibold">{formatCurrency(calculateOrderTotal(order))}</span>
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
                      className="whitespace-nowrap text-sm text-foreground/70 hover:text-foreground"
                    >
                      Voltar etapa
                    </button>
                  )}
                  {nextStatus && (
                    <button
                      type="button"
                      onClick={() =>
                        changeStatus.mutate(
                          { orderId: order.id, newStatus: nextStatus },
                          { onError: (error) => handleError(error, 'Falha ao avançar etapa') },
                        )
                      }
                      disabled={changeStatus.isPending}
                      className={cn(buttonClass('primary'), 'whitespace-nowrap px-3 py-1.5 text-sm')}
                    >
                      Avançar etapa
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-secondary/10 p-4">
        <div>
          <span className="block text-xs font-medium uppercase tracking-wide text-foreground/50">
            Total da mesa
          </span>
          <span className="text-lg font-semibold">{formatCurrency(grandTotal)}</span>
        </div>
        <button
          type="button"
          onClick={() =>
            finalizeAll.mutate(
              orders.map((order) => order.id),
              {
                onSuccess: () => toast.success('Mesa finalizada.'),
                onError: (error) => handleError(error, 'Falha ao finalizar mesa'),
              },
            )
          }
          disabled={finalizeAll.isPending}
          className={buttonClass('primary')}
        >
          Finalizar tudo
        </button>
      </div>
    </div>
  )
}
