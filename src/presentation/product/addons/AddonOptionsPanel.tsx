import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { AddonOption } from '../../../domain/product/Addon'
import { Button } from '../../ui/Button'
import { ConfirmModal } from '../../ui/ConfirmModal'
import { AddonOptionModal } from './AddonOptionModal'
import { useAddonOptionList, useDeleteAddonOption } from './useAddons'

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function AddonOptionsPanel({ groupId }: { groupId: string }) {
  const { data: options, isLoading } = useAddonOptionList(groupId)
  const deleteOption = useDeleteAddonOption()
  const [editingOption, setEditingOption] = useState<AddonOption | null>(null)
  const [deletingOption, setDeletingOption] = useState<AddonOption | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  async function handleDelete() {
    if (!deletingOption) return
    try {
      await deleteOption.mutateAsync({ id: deletingOption.id, groupId })
      toast.success('Adicional excluído.')
      setDeletingOption(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao excluir adicional')
    }
  }

  return (
    <div className="space-y-3 bg-secondary/5 px-6 py-4">
      <div className="flex items-center justify-between">
        <span className="font-body text-sm text-foreground/60">Adicionais desse grupo</span>
        <Button variant="outline" onClick={() => setIsCreating(true)} className="h-8 gap-1.5 px-3 text-sm">
          <Plus className="h-3.5 w-3.5" />
          Novo adicional
        </Button>
      </div>

      {isLoading && <p className="font-body text-sm">Carregando...</p>}
      {options && options.length === 0 && (
        <p className="font-body text-sm text-foreground/60">Nenhum adicional nesse grupo ainda.</p>
      )}

      {options && options.length > 0 && (
        <ul className="divide-y divide-secondary/15 rounded-lg border border-secondary/15 bg-background">
          {options.map((option) => (
            <li key={option.id} className="flex items-center justify-between px-4 py-2 font-body text-sm">
              <span className={option.active ? '' : 'text-foreground/40 line-through'}>{option.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-foreground/70">
                  {formatCurrency(option.price)}
                  {option.loverPrice != null && (
                    <span className="text-primary"> · lover {formatCurrency(option.loverPrice)}</span>
                  )}
                </span>
                <button
                  type="button"
                  aria-label={`Editar ${option.name}`}
                  onClick={() => setEditingOption(option)}
                  className="rounded-md p-1.5 text-foreground/50 hover:bg-secondary/10 hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Excluir ${option.name}`}
                  onClick={() => setDeletingOption(option)}
                  className="rounded-md p-1.5 text-foreground/50 hover:bg-red-700/10 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isCreating && <AddonOptionModal groupId={groupId} onClose={() => setIsCreating(false)} />}

      {editingOption && (
        <AddonOptionModal
          key={editingOption.id}
          groupId={groupId}
          option={editingOption}
          onClose={() => setEditingOption(null)}
        />
      )}

      {deletingOption && (
        <ConfirmModal
          title="Excluir adicional"
          description={`Excluir "${deletingOption.name}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Confirmar exclusão"
          pendingLabel="Excluindo..."
          confirmVariant="danger"
          isPending={deleteOption.isPending}
          onClose={() => setDeletingOption(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
