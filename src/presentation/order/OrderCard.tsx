import { useState } from 'react'
import { MapPin, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import type { Order } from '../../domain/order/Order'
import {
  canCancel,
  canEditItems,
  canRevert,
  getNextStatus,
  needsAttendantToAdvance,
  orderChannelLabel,
  statusLabel,
} from '../../domain/order/orderStatusRules'
import { calculateOrderTotal } from '../../domain/order/orderPricing'
import { AcceptOrderModal } from '../attendant/AcceptOrderModal'
import { buttonClass } from '../ui/styles'
import { CancelOrderModal } from './CancelOrderModal'
import { OrderDetailsDrawer } from './OrderDetailsDrawer'
import { OrderItemsEditModal } from './OrderItemsEditModal'
import { OrderItemsList } from './OrderItemsList'
import {
  BADGE_COLOR,
  formatCpf,
  formatCurrency,
  formatName,
  formatPhone,
  STATUS_BAND_CLASS,
  STATUS_DOT_CLASS,
  whatsAppLink,
} from './orderCardFormat'
import { useChangeOrderStatus, useRevertOrderStatus } from './useOrders'

function handleStatusMutationError(error: unknown, fallback: string) {
  toast.error(error instanceof Error ? error.message : fallback)
}

export function OrderCard({ order }: { order: Order }) {
  const changeStatus = useChangeOrderStatus()
  const revertStatus = useRevertOrderStatus()
  const nextStatus = getNextStatus(order.status, order.orderType)
  const [isEditingItems, setIsEditingItems] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  return (
    <div
      data-testid="order-card"
      data-order-id={order.id}
      className="flex flex-col rounded-xl border border-secondary/15 bg-background font-body shadow-sm transition-shadow hover:shadow-md overflow-hidden"
    >
      {/* Banda de status */}
      <div
        className={`flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 py-2 ${STATUS_BAND_CLASS[order.status]}`}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT_CLASS[order.status]}`} />
          {statusLabel(order.status, order.orderType)}
        </span>
        <span className="flex items-center gap-3 text-xs whitespace-nowrap">
          {order.tableNumber && <span className="font-semibold">Mesa {order.tableNumber}</span>}
          <span>
            {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Cliente */}
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium">
              {order.customerName ? formatName(order.customerName) : 'Não identificado'}
            </span>
            <span className={`rounded-full text-xs px-2 py-0.5 shrink-0 ${BADGE_COLOR[orderChannelLabel(order)]}`}>
              {orderChannelLabel(order)}
            </span>
          </div>
          {order.customerCpf && <p className="text-xs text-foreground/60">CPF {formatCpf(order.customerCpf)}</p>}
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

        {/* Entrega/Retirada */}
        {order.orderType === 'delivery' && order.deliveryAddress && (
          <div className="flex gap-2 text-xs text-foreground/70">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <p>
              {order.deliveryAddress.street}, {order.deliveryAddress.number}
              {order.deliveryAddress.complement && ` - ${order.deliveryAddress.complement}`}
              <br />
              {order.deliveryAddress.neighborhood} - {order.deliveryAddress.city}
            </p>
          </div>
        )}
        {/* Itens */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-foreground/50">
              Itens · {order.items.length}
            </span>
            {canEditItems(order.status) && (
              <button
                type="button"
                onClick={() => setIsEditingItems(true)}
                className="flex items-center gap-1 text-xs text-foreground/50 hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
            )}
          </div>

          <div className="mt-1.5">
            <OrderItemsList items={order.items} />
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="mt-auto space-y-3 border-t border-secondary/10 p-4">
        <div>
          <span className="block text-xs font-medium uppercase tracking-wide text-foreground/50">Total</span>
          <span className="text-lg font-semibold">{formatCurrency(calculateOrderTotal(order))}</span>
        </div>
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

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDetailsOpen(true)}
              className="text-foreground/70 hover:text-foreground"
            >
              Detalhes
            </button>
            {order.customerPhone && (
              <a
                href={whatsAppLink(order)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/70 hover:text-[#25D366] transition-colors"
              >
                Contatar
              </a>
            )}
          </div>
          {(canRevert(order.status) || canCancel(order.status)) && (
            <div className="flex items-center justify-end gap-3">
              {canRevert(order.status) && (
                <button
                  type="button"
                  onClick={() =>
                    revertStatus.mutate(order.id, {
                      onError: (error) => handleStatusMutationError(error, 'Falha ao voltar etapa'),
                    })
                  }
                  disabled={revertStatus.isPending}
                  className="whitespace-nowrap text-foreground/70 hover:text-foreground"
                >
                  Voltar etapa
                </button>
              )}
              {canCancel(order.status) && (
                <button type="button" onClick={() => setIsCancelling(true)} className="text-red-700">
                  Cancelar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {isDetailsOpen && <OrderDetailsDrawer order={order} onClose={() => setIsDetailsOpen(false)} />}

      {isEditingItems && <OrderItemsEditModal order={order} onClose={() => setIsEditingItems(false)} />}

      {isAccepting && nextStatus && (
        <AcceptOrderModal order={order} nextStatus={nextStatus} onClose={() => setIsAccepting(false)} />
      )}

      {isCancelling && (
        <CancelOrderModal
          isPending={changeStatus.isPending}
          onClose={() => setIsCancelling(false)}
          onConfirm={(reason) =>
            changeStatus.mutate(
              { orderId: order.id, newStatus: 'cancelled', reason },
              {
                onSuccess: () => setIsCancelling(false),
                onError: (error) => handleStatusMutationError(error, 'Falha ao cancelar pedido'),
              },
            )
          }
        />
      )}
    </div>
  )
}
