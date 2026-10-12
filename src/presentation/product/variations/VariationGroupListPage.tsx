import { useState } from 'react'
import { ChevronDown, ChevronRight, GripVertical, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useEffectiveStoreId } from '../../storeContext/useEffectiveStoreId'
import type { VariationGroup } from '../../../domain/product/Variation'
import { Button } from '../../ui/Button'
import { ConfirmModal } from '../../ui/ConfirmModal'
import { SortableItem, SortableList } from '../../ui/SortableList'
import { cardClass, tableCardClass } from '../../ui/styles'
import { VariationGroupModal } from './VariationGroupModal'
import { VariationOptionsPanel } from './VariationOptionsPanel'
import { useDeleteVariationGroup, useReorderVariationGroups, useVariationGroupList } from './useVariations'
import { CatalogTabs } from '../CatalogTabs'

export function VariationGroupListPage() {
  const storeId = useEffectiveStoreId()
  const { data: groups, isLoading, error } = useVariationGroupList(storeId ?? '')
  const deleteGroup = useDeleteVariationGroup()
  const reorderGroups = useReorderVariationGroups()
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
  const [editingGroup, setEditingGroup] = useState<VariationGroup | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<VariationGroup | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  async function handleDelete() {
    if (!deletingGroup) return
    try {
      await deleteGroup.mutateAsync(deletingGroup.id)
      toast.success('Grupo excluído.')
      setDeletingGroup(null)
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Falha ao excluir grupo')
    }
  }

  function handleReorder(nextIds: string[]) {
    if (!storeId) return
    reorderGroups.mutate(
      { storeId, orderedGroupIds: nextIds },
      { onError: (e) => toast.error(e instanceof Error ? e.message : 'Falha ao reordenar grupos') },
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink">Variações</h2>
          <p className="font-body text-sm text-muted">
            Grupos de variação, como sabor ou tamanho. O cliente sempre escolhe uma opção quando o grupo está
            ligado ao produto. Arraste para mudar a ordem no cardápio.
          </p>
        </div>
        {storeId && (
          <div className="flex gap-3">
            <Button onClick={() => setIsCreating(true)}>Novo grupo</Button>
          </div>
        )}
      </div>

      <CatalogTabs />

      {!storeId && <p className="font-body">Selecione uma loja pra ver as variações.</p>}
      {isLoading && <p className="font-body">Carregando...</p>}
      {error && <p className="font-body text-danger">Erro ao carregar grupos de variação</p>}

      {groups && groups.length === 0 && (
        <div className={cardClass}>
          <p className="font-body text-muted">Nenhum grupo de variação cadastrado ainda.</p>
        </div>
      )}

      {groups && groups.length > 0 && (
        <div className={tableCardClass}>
          <SortableList ids={groups.map((group) => group.id)} onReorder={handleReorder}>
            <div className="divide-y divide-line">
              {groups.map((group) => {
                const isExpanded = expandedGroupId === group.id
                return (
                  <SortableItem key={group.id} id={group.id}>
                    {({ setActivatorNodeRef, attributes, listeners }) => (
                      <div>
                        <div className="flex items-center gap-1 py-1 pr-4">
                          <button
                            type="button"
                            ref={setActivatorNodeRef}
                            {...attributes}
                            {...listeners}
                            aria-label={`Arrastar ${group.name}`}
                            className="shrink-0 cursor-grab touch-none rounded-md p-1.5 text-faint hover:bg-surface-2 hover:text-ink active:cursor-grabbing"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={isExpanded ? `Recolher ${group.name}` : `Expandir ${group.name}`}
                            onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                            className="shrink-0 rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          <span className="flex-1 py-2 font-body">
                            <span className={group.active ? '' : 'text-faint line-through'}>
                              {group.name}
                            </span>
                            <span className="ml-2 text-xs text-muted">
                              {group.priceMode === 'replace' ? 'Substitui o preço base' : 'Soma ao preço base'}
                            </span>
                          </span>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              aria-label={`Editar ${group.name}`}
                              onClick={() => setEditingGroup(group)}
                              className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Excluir ${group.name}`}
                              onClick={() => setDeletingGroup(group)}
                              className="rounded-md p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {isExpanded && <VariationOptionsPanel groupId={group.id} />}
                      </div>
                    )}
                  </SortableItem>
                )
              })}
            </div>
          </SortableList>
        </div>
      )}

      {deletingGroup && (
        <ConfirmModal
          title="Excluir grupo de variação"
          description={`Excluir "${deletingGroup.name}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Confirmar exclusão"
          pendingLabel="Excluindo..."
          confirmVariant="danger"
          isPending={deleteGroup.isPending}
          onClose={() => setDeletingGroup(null)}
          onConfirm={handleDelete}
        />
      )}

      {editingGroup && storeId && (
        <VariationGroupModal
          key={editingGroup.id}
          storeId={storeId}
          group={editingGroup}
          onClose={() => setEditingGroup(null)}
        />
      )}

      {isCreating && storeId && (
        <VariationGroupModal storeId={storeId} onClose={() => setIsCreating(false)} />
      )}
    </div>
  )
}
