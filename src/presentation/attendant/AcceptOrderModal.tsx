import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Order, OrderStatus } from '../../domain/order/Order'
import { Button } from '../ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/Dialog'
import { initials } from '../ui/initials'
import { printOrderReceipt } from '../order/printOrderReceipt'
import { useChangeOrderStatus } from '../order/useOrders'
import { useStore } from '../store/useStores'
import { AttendantModal } from './AttendantModal'
import { useAttendantList } from './useAttendants'

export function AcceptOrderModal({
  order,
  nextStatus,
  onClose,
}: {
  order: Order
  nextStatus: OrderStatus
  onClose: () => void
}) {
  const { data: attendants } = useAttendantList(order.storeId)
  const { data: store } = useStore(order.storeId)
  const changeStatus = useChangeOrderStatus()
  const [attendantId, setAttendantId] = useState('')
  const [attendantName, setAttendantName] = useState('')
  const [isCreatingAttendant, setIsCreatingAttendant] = useState(false)

  const activeAttendants = (attendants ?? []).filter((attendant) => attendant.active)

  function handleConfirm() {
    if (!attendantId) return
    changeStatus.mutate(
      { orderId: order.id, newStatus: nextStatus, attendantId },
      {
        onSuccess: () => {
          printOrderReceipt(order, store?.name ?? '', attendantName)
          onClose()
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : 'Falha ao aceitar pedido'),
      },
    )
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-[440px]">
          <div className="flex flex-col gap-1">
            <DialogTitle>Quem vai preparar?</DialogTitle>
            <DialogDescription>O cupom sai na impressora assim que você aceitar.</DialogDescription>
          </div>

          {activeAttendants.length > 0 && (
            <div role="radiogroup" aria-label="Atendente" className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {activeAttendants.map((attendant) => {
                const checked = attendant.id === attendantId
                return (
                  <label
                    key={attendant.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] px-3.5 py-3 transition-colors ${
                      checked ? 'border-ink bg-chosen' : 'border-line-strong hover:bg-canvas'
                    }`}
                  >
                    <input
                      type="radio"
                      name="attendant"
                      value={attendant.id}
                      checked={checked}
                      onChange={() => {
                        setAttendantId(attendant.id)
                        setAttendantName(attendant.name)
                      }}
                      className="h-[18px] w-[18px] accent-ink"
                    />
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
                        checked ? 'bg-caramel text-ink' : 'bg-tile text-lover'
                      }`}
                    >
                      {initials(attendant.name)}
                    </span>
                    <span className="font-semibold">{attendant.name}</span>
                  </label>
                )
              })}
            </div>
          )}

          {activeAttendants.length === 0 && <p className="text-sm text-muted">Nenhum atendente cadastrado ainda.</p>}

          <button
            type="button"
            onClick={() => setIsCreatingAttendant(true)}
            className="flex w-fit items-center gap-1.5 text-sm font-semibold text-lover hover:underline"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo atendente
          </button>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Voltar
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={!attendantId || changeStatus.isPending}>
              {changeStatus.isPending ? 'Aceitando...' : 'Aceitar pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isCreatingAttendant && (
        <AttendantModal
          storeId={order.storeId}
          onClose={() => setIsCreatingAttendant(false)}
          onCreated={(attendant) => {
            setAttendantId(attendant.id)
            setAttendantName(attendant.name)
            setIsCreatingAttendant(false)
          }}
        />
      )}
    </>
  )
}
