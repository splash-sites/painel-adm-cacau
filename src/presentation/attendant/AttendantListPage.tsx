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
          <h2 className="font-display text-2xl md:text-3xl text-accent">Atendentes</h2>
          <p className="font-body text-sm text-foreground/60">
            Quem prepara os pedidos — vinculado na hora de aceitar um pedido no Dashboard, sem login.
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
      {error && <p className="font-body text-red-600">Erro ao carregar atendentes</p>}

      {attendants && attendants.length === 0 && (
        <div className={cardClass}>
          <p className="font-body text-foreground/70">Nenhum atendente cadastrado ainda.</p>
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
                    <span className={attendant.active ? '' : 'text-foreground/40 line-through'}>
                      {attendant.name}
                    </span>
                  </td>
                  <td className="py-3 pr-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Editar ${attendant.name}`}
                        onClick={() => setEditingAttendant(attendant)}
                        className="rounded-md p-1.5 text-foreground/50 hover:bg-secondary/10 hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Excluir ${attendant.name}`}
                        onClick={() => setDeletingAttendant(attendant)}
                        className="rounded-md p-1.5 text-foreground/50 hover:bg-red-700/10 hover:text-red-700"
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
