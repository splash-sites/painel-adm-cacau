import { useState } from 'react'
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { VariationOption } from '../../../domain/product/Variation'
import { Button } from '../../ui/Button'
import { ConfirmModal } from '../../ui/ConfirmModal'
import { SortableItem, SortableList } from '../../ui/SortableList'
import { VariationOptionModal } from './VariationOptionModal'
import { useDeleteVariationOption, useReorderVariationOptions, useVariationOptionList } from './useVariations'

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function VariationOptionsPanel({ groupId }: { groupId: string }) {
  const { data: options, isLoading } = useVariationOptionList(groupId)
  const deleteOption = useDeleteVariationOption()
  const reorderOptions = useReorderVariationOptions()
  const [editingOption, setEditingOption] = useState<VariationOption | null>(null)
  const [deletingOption, setDeletingOption] = useState<VariationOption | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  async function handleDelete() {
    if (!deletingOption) return
    try {
      await deleteOption.mutateAsync({ id: deletingOption.id, groupId })
      toast.success('Variação excluída.')
      setDeletingOption(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao excluir variação')
    }
  }

  function handleReorder(nextIds: string[]) {
    reorderOptions.mutate(
      { groupId, orderedOptionIds: nextIds },
      { onError: (e) => toast.error(e instanceof Error ? e.message : 'Falha ao reordenar variações') },
    )
  }

  return (
    <div className="space-y-3 bg-secondary/5 px-6 py-4">
      <div className="flex items-center justify-between">
        <span className="font-body text-sm text-foreground/60">Variações desse grupo</span>
        <Button variant="outline" onClick={() => setIsCreating(true)} className="h-8 gap-1.5 px-3 text-sm">
          <Plus className="h-3.5 w-3.5" />
          Nova variação
        </Button>
      </div>

      {isLoading && <p className="font-body text-sm">Carregando...</p>}
      {options && options.length === 0 && (
        <p className="font-body text-sm text-foreground/60">Nenhuma variação nesse grupo ainda.</p>
      )}

      {options && options.length > 0 && (
        <div className="rounded-lg border border-secondary/15 bg-background">
          <SortableList ids={options.map((option) => option.id)} onReorder={handleReorder}>
            <div className="divide-y divide-secondary/15">
              {options.map((option) => (
                <SortableItem key={option.id} id={option.id}>
                  {({ setActivatorNodeRef, attributes, listeners }) => (
                    <div className="flex items-center justify-between gap-2 pr-4 font-body text-sm">
                      <div className="flex min-w-0 items-center gap-1">
                        <button
                          type="button"
                          ref={setActivatorNodeRef}
                          {...attributes}
                          {...listeners}
                          aria-label={`Arrastar ${option.name}`}
                          className="shrink-0 cursor-grab touch-none rounded-md p-1.5 text-foreground/40 hover:bg-secondary/10 hover:text-foreground active:cursor-grabbing"
                        >
                          <GripVertical className="h-3.5 w-3.5" />
                        </button>
                        <span className={`truncate py-2 ${option.active ? '' : 'text-foreground/40 line-through'}`}>
                          {option.name}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-foreground/70">
                          {option.price === 0 ? 'sem diferença' : `+ ${formatCurrency(option.price)}`}
                          {option.loverPrice != null && (
                            <span className="text-primary">
                              {' '}
                              · lover{' '}
                              {option.loverPrice === 0 ? 'sem diferença' : `+ ${formatCurrency(option.loverPrice)}`}
                            </span>
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
                    </div>
                  )}
                </SortableItem>
              ))}
            </div>
          </SortableList>
        </div>
      )}

      {isCreating && <VariationOptionModal groupId={groupId} onClose={() => setIsCreating(false)} />}

      {editingOption && (
        <VariationOptionModal
          key={editingOption.id}
          groupId={groupId}
          option={editingOption}
          onClose={() => setEditingOption(null)}
        />
      )}

      {deletingOption && (
        <ConfirmModal
          title="Excluir variação"
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
