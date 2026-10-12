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
  nextActionLabel,
  orderChannelLabel,
  statusLabel,
  waitingLabel,
} from '../../domain/order/orderStatusRules'
import { calculateOrderTotal, needsLoverQuestion } from '../../domain/order/orderPricing'
import { AcceptOrderModal } from '../attendant/AcceptOrderModal'
import { CancelOrderModal } from './CancelOrderModal'
import { FinalizeLoverModal } from './FinalizeLoverModal'
import { LoverTotalHint } from './LoverTotalHint'
import { OrderDetailsDrawer } from './OrderDetailsDrawer'
import { OrderItemsEditModal } from './OrderItemsEditModal'
import { OrderItemsList } from './OrderItemsList'
import { formatCpf, formatCurrency, formatName, formatPhone, STATUS_BAND_CLASS, whatsAppLink } from './orderCardFormat'
import { useNow } from './useNow'
import { useChangeOrderStatus, useRevertOrderStatus } from './useOrders'

function handleStatusMutationError(error: unknown, fallback: string) {
  toast.error(error instanceof Error ? error.message : fallback)
}

const secondaryButtonClass =
  'flex-1 min-h-10 rounded-xl border-[1.5px] border-line-strong bg-transparent px-3 text-sm font-semibold transition-colors hover:bg-canvas disabled:opacity-50'

export function OrderCard({ order }: { order: Order }) {
  const changeStatus = useChangeOrderStatus()
  const revertStatus = useRevertOrderStatus()
  const now = useNow()
  const nextStatus = getNextStatus(order.status, order.orderType)
  const actionLabel = nextActionLabel(order.status, order.orderType)
  const [isEditingItems, setIsEditingItems] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isFinalizingLover, setIsFinalizingLover] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const isWaiting = order.status === 'received' || order.status === 'preparing'
  const subtitle = [
    orderChannelLabel(order),
    order.tableNumber && `Mesa ${order.tableNumber}`,
    order.attendantName && `com ${order.attendantName}`,
  ]
    .filter(Boolean)
    .join(', ')

  function advance() {
    if (!nextStatus) return
    if (needsAttendantToAdvance(order.status)) return setIsAccepting(true)
    if (needsLoverQuestion([order], nextStatus)) return setIsFinalizingLover(true)
    changeStatus.mutate(
      { orderId: order.id, newStatus: nextStatus },
      { onError: (error) => handleStatusMutationError(error, 'Falha ao avançar etapa') },
    )
  }

  return (
    <article
      data-testid="order-card"
      data-order-id={order.id}
      className="flex flex-col gap-3 rounded-[20px] bg-surface p-4 font-body"
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="break-words font-display text-[19px] font-bold leading-tight">
            {order.customerName ? formatName(order.customerName) : 'Não identificado'}
          </span>
          <span className="text-[13px] text-muted">{subtitle}</span>
        </div>
        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BAND_CLASS[order.status]}`}
          title={new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        >
          {isWaiting ? waitingLabel(order.createdAt, now) : statusLabel(order.status, order.orderType)}
        </span>
      </header>

      {(order.customerCpf || order.customerPhone) && (
        <p className="-mt-1 flex flex-wrap gap-x-2 text-xs text-muted">
          {order.customerCpf && <span>CPF {formatCpf(order.customerCpf)}</span>}
          {order.customerPhone && (
            <a
              href={whatsAppLink(order)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-ink hover:underline"
            >
              {formatPhone(order.customerPhone)}
            </a>
          )}
        </p>
      )}

      {order.orderType === 'delivery' && order.deliveryAddress && (
        <p className="flex gap-1.5 text-[13px] text-muted">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            {order.deliveryAddress.street}, {order.deliveryAddress.number}
            {order.deliveryAddress.complement && ` - ${order.deliveryAddress.complement}`},{' '}
            {order.deliveryAddress.neighborhood}, {order.deliveryAddress.city}
          </span>
        </p>
      )}

      <OrderItemsList items={order.items} />

      <div className="flex items-baseline justify-between gap-2 border-t border-line pt-2.5 tabular-nums">
        <span className="text-lg font-semibold">{formatCurrency(calculateOrderTotal(order))}</span>
        <LoverTotalHint order={order} />
      </div>

      {nextStatus && actionLabel && (
        <button
          type="button"
          onClick={advance}
          disabled={changeStatus.isPending}
          className="min-h-11 rounded-xl bg-ink px-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#3d2820] disabled:opacity-50"
        >
          {actionLabel}
        </button>
      )}

      {(canEditItems(order.status) || canCancel(order.status) || canRevert(order.status)) && (
        <div className="flex gap-2">
          {canEditItems(order.status) && (
            <button type="button" onClick={() => setIsEditingItems(true)} className={`${secondaryButtonClass} text-ink`}>
              <Pencil className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
              Editar
            </button>
          )}
          {canCancel(order.status) && (
            <button type="button" onClick={() => setIsCancelling(true)} className={`${secondaryButtonClass} text-danger`}>
              Cancelar
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
              className={`${secondaryButtonClass} text-ink`}
            >
              Voltar etapa
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 text-[13px]">
        <button type="button" onClick={() => setIsDetailsOpen(true)} className="font-semibold text-lover hover:underline">
          Detalhes
        </button>
        {order.customerPhone && (
          <a
            href={whatsAppLink(order)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-lover hover:underline"
          >
            Chamar no WhatsApp
          </a>
        )}
      </div>

      {isDetailsOpen && <OrderDetailsDrawer order={order} onClose={() => setIsDetailsOpen(false)} />}

      {isEditingItems && <OrderItemsEditModal order={order} onClose={() => setIsEditingItems(false)} />}

      {isAccepting && nextStatus && (
        <AcceptOrderModal order={order} nextStatus={nextStatus} onClose={() => setIsAccepting(false)} />
      )}
      {isFinalizingLover && <FinalizeLoverModal orders={[order]} onClose={() => setIsFinalizingLover(false)} />}

      {isCancelling && (
        <CancelOrderModal
          customerName={order.customerName ? formatName(order.customerName) : null}
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
    </article>
  )
}
