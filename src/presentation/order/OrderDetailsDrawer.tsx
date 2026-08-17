import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import type { Order } from '../../domain/order/Order'
import {
  canEditItems,
  canRevert,
  getNextStatus,
  needsAttendantToAdvance,
  orderChannelLabel,
  statusLabel,
} from '../../domain/order/orderStatusRules'
import { calculateOrderTotal } from '../../domain/order/orderPricing'
import { AcceptOrderModal } from '../attendant/AcceptOrderModal'
import { Dialog, DialogClose, DialogSideContent } from '../ui/Dialog'
import { buttonClass } from '../ui/styles'
import { OrderItemsEditModal } from './OrderItemsEditModal'
import { OrderItemsList } from './OrderItemsList'
import {
  BADGE_COLOR,
  formatCpf,
  formatCurrency,
  formatName,
  formatPhone,
  STATUS_DOT_CLASS,
  whatsAppLink,
} from './orderCardFormat'
import { useChangeOrderStatus, useRevertOrderStatus } from './useOrders'

function handleStatusMutationError(error: unknown, fallback: string) {
  toast.error(error instanceof Error ? error.message : fallback)
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OrderDetailsDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  const changeStatus = useChangeOrderStatus()
  const revertStatus = useRevertOrderStatus()
  const nextStatus = getNextStatus(order.status, order.orderType)
  const [isEditingItems, setIsEditingItems] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogSideContent>
          <div className="flex items-start justify-between">
            <h3 className="font-display text-xl text-accent">Detalhes do pedido</h3>
            <DialogClose className="rounded-md p-1.5 text-foreground/50 hover:bg-secondary/10 hover:text-foreground">
              <X className="h-5 w-5" />
            </DialogClose>
          </div>

          <div className="mt-6 space-y-6">
            <section className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wide text-foreground/50">Cliente</h4>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium">
                  {order.customerName ? formatName(order.customerName) : 'Não identificado'}
                </span>
                <span className={`rounded-full text-xs px-2 py-0.5 shrink-0 ${BADGE_COLOR[orderChannelLabel(order)]}`}>
                  {orderChannelLabel(order)}
                </span>
              </div>
              {order.customerCpf && (
                <p className="text-sm text-foreground/70">CPF {formatCpf(order.customerCpf)}</p>
              )}
              {order.customerPhone && (
                <p className="text-sm">
                  <a
                    href={whatsAppLink(order)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground/70 hover:text-[#25D366] transition-colors"
                  >
                    {formatPhone(order.customerPhone)}
                  </a>
                </p>
              )}
              {order.tableNumber && <p className="text-sm text-foreground/70">Mesa {order.tableNumber}</p>}
              {order.orderType === 'delivery' && order.deliveryAddress && (
                <p className="text-sm text-foreground/70">
                  {order.deliveryAddress.street}, {order.deliveryAddress.number}
                  {order.deliveryAddress.complement && ` - ${order.deliveryAddress.complement}`}
                  <br />
                  {order.deliveryAddress.neighborhood} - {order.deliveryAddress.city}
                </p>
              )}
            </section>

            <section className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wide text-foreground/50">Linha do tempo</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center justify-between text-foreground/70">
                  <span>Pedido criado</span>
                  <span>{formatDateTime(order.createdAt)}</span>
                </li>
                <li className="flex items-center justify-between rounded-lg bg-primary/10 px-2.5 py-1.5 font-medium text-accent">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT_CLASS[order.status]}`} />
                    {statusLabel(order.status, order.orderType)}
                  </span>
                  <span>{formatDateTime(order.updatedAt)}</span>
                </li>
              </ul>
              {order.status === 'cancelled' && order.cancellationReason && (
                <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-sm text-red-800">
                  Motivo: {order.cancellationReason}
                </p>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                  Itens · {order.items.length}
                </h4>
                {canEditItems(order.status) && (
                  <button
                    type="button"
                    onClick={() => setIsEditingItems(true)}
                    className="text-xs text-foreground/60 hover:text-foreground"
                  >
                    Editar itens
                  </button>
                )}
              </div>
              <OrderItemsList items={order.items} />
            </section>

            <div className="flex items-center justify-between border-t border-secondary/10 pt-4">
              <span className="text-sm text-foreground/50">Total</span>
              <span className="text-lg font-semibold">{formatCurrency(calculateOrderTotal(order))}</span>
            </div>

            <div className="space-y-2">
              {nextStatus && (
                <button
                  type="button"
                  onClick={() =>
                    needsAttendantToAdvance(order.status)
                      ? setIsAccepting(true)
                      : changeStatus.mutate(
                          { orderId: order.id, newStatus: nextStatus },
                          { onError: (error) => handleStatusMutationError(error, 'Falha ao avançar etapa') },
                        )
                  }
                  disabled={changeStatus.isPending}
                  className={`w-full ${buttonClass('primary')}`}
                >
                  Avançar etapa
                </button>
              )}
              {canRevert(order.status) && (
                <button
                  type="button"
                  onClick={() =>
                    revertStatus.mutate(order.id, {
                      onError: (error) => handleStatusMutationError(error, 'Falha ao voltar etapa'),
                    })
                  }
                  disabled={revertStatus.isPending}
                  className={`w-full ${buttonClass('outline')}`}
                >
                  Voltar etapa
                </button>
              )}
            </div>
          </div>
        </DialogSideContent>
      </Dialog>

      {isEditingItems && <OrderItemsEditModal order={order} onClose={() => setIsEditingItems(false)} />}

      {isAccepting && nextStatus && (
        <AcceptOrderModal order={order} nextStatus={nextStatus} onClose={() => setIsAccepting(false)} />
      )}
    </>
  )
}
