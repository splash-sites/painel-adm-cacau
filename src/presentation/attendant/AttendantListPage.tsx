import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useEffectiveStoreId } from '../storeContext/useEffectiveStoreId'
import type { Attendant } from '../../domain/attendant/Attendant'
import { Button } from '../ui/Button'
import { ConfirmModal } from '../ui/ConfirmModal'
import { cardClass, tableCardClass, tableHeaderCellClass, tableRowClass } from '../ui/styles'
import { AttendantModal } from './AttendantModal'
import { useAttendantList, useDeleteAttendant } from './useAttendants'

export function AttendantListPage() {
  const storeId = useEffectiveStoreId()
  const { data: attendants, isLoading, error } = useAttendantList(storeId ?? '')
  const deleteAttendant = useDeleteAttendant()
  const [editingAttendant, setEditingAttendant] = useState<Attendant | null>(null)
  const [deletingAttendant, setDeletingAttendant] = useState<Attendant | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  async function handleDelete() {
    if (!deletingAttendant) return
    try {
      await deleteAttendant.mutateAsync(deletingAttendant.id)
      toast.success('Atendente excluído.')
      setDeletingAttendant(null)
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Falha ao excluir atendente')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink">Atendentes</h2>
          <p className="font-body text-sm text-muted">
            Quem prepara os pedidos. Você escolhe a pessoa ao aceitar cada pedido. Atendente não tem login.
          </p>
        </div>
        {storeId && (
          <Button onClick={() => setIsCreating(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Novo atendente
          </Button>
        )}
      </div>

      {!storeId && <p className="font-body">Selecione uma loja pra ver os atendentes.</p>}
      {isLoading && <p className="font-body">Carregando...</p>}
      {error && <p className="font-body text-danger">Erro ao carregar atendentes</p>}

      {attendants && attendants.length === 0 && (
        <div className={cardClass}>
          <p className="font-body text-muted">Nenhum atendente cadastrado ainda.</p>
        </div>
      )}

      {attendants && attendants.length > 0 && (
        <div className={tableCardClass}>
          <table className="w-full text-left font-body">
            <thead>
              <tr className="h-11">
                <th className={`${tableHeaderCellClass} pl-6`}>Nome</th>
                <th className={`${tableHeaderCellClass} pr-6`}></th>
              </tr>
            </thead>
            <tbody>
              {attendants.map((attendant) => (
                <tr key={attendant.id} className={tableRowClass}>
                  <td className="py-3 pl-6">
                    <span className={attendant.active ? '' : 'text-faint line-through'}>
                      {attendant.name}
                    </span>
                  </td>
                  <td className="py-3 pr-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Editar ${attendant.name}`}
                        onClick={() => setEditingAttendant(attendant)}
                        className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Excluir ${attendant.name}`}
                        onClick={() => setDeletingAttendant(attendant)}
                        className="rounded-md p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deletingAttendant && (
        <ConfirmModal
          title="Excluir atendente"
          description={`Excluir "${deletingAttendant.name}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Confirmar exclusão"
          pendingLabel="Excluindo..."
          confirmVariant="danger"
          isPending={deleteAttendant.isPending}
          onClose={() => setDeletingAttendant(null)}
          onConfirm={handleDelete}
        />
      )}

      {editingAttendant && storeId && (
        <AttendantModal
          key={editingAttendant.id}
          storeId={storeId}
          attendant={editingAttendant}
          onClose={() => setEditingAttendant(null)}
        />
      )}

      {isCreating && storeId && <AttendantModal storeId={storeId} onClose={() => setIsCreating(false)} />}
    </div>
  )
}
