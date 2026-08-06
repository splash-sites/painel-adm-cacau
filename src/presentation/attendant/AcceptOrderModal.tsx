import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Order, OrderStatus } from '../../domain/order/Order'
import { Button } from '../ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/Dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select'
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
        <DialogContent className="max-w-sm">
          <DialogTitle>Quem vai preparar?</DialogTitle>
          <DialogDescription>Aceitar o pedido exige vincular um atendente.</DialogDescription>

          {activeAttendants.length > 0 && (
            <Select
              value={attendantId}
              onValueChange={(id) => {
                setAttendantId(id)
                setAttendantName(activeAttendants.find((attendant) => attendant.id === id)?.name ?? '')
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o atendente" />
              </SelectTrigger>
              <SelectContent>
                {activeAttendants.map((attendant) => (
                  <SelectItem key={attendant.id} value={attendant.id}>
                    {attendant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {activeAttendants.length === 0 && (
            <p className="text-sm font-body text-foreground/60">Nenhum atendente cadastrado ainda.</p>
          )}

          <button
            type="button"
            onClick={() => setIsCreatingAttendant(true)}
            className="flex w-fit items-center gap-1.5 text-sm font-body text-primary hover:underline"
          >
            <Plus className="h-4 w-4" />
            Novo atendente
          </button>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
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
