import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight, GripVertical, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useEffectiveStoreId } from '../../storeContext/useEffectiveStoreId'
import type { AddonGroup } from '../../../domain/product/Addon'
import { Button } from '../../ui/Button'
import { ConfirmModal } from '../../ui/ConfirmModal'
import { SortableItem, SortableList } from '../../ui/SortableList'
import { cardClass, tableCardClass } from '../../ui/styles'
import { AddonGroupModal } from './AddonGroupModal'
import { AddonOptionsPanel } from './AddonOptionsPanel'
import { useAddonGroupList, useDeleteAddonGroup, useReorderAddonGroups } from './useAddons'

export function AddonGroupListPage() {
  const storeId = useEffectiveStoreId()
  const navigate = useNavigate()
  const { data: groups, isLoading, error } = useAddonGroupList(storeId ?? '')
  const deleteGroup = useDeleteAddonGroup()
  const reorderGroups = useReorderAddonGroups()
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
  const [editingGroup, setEditingGroup] = useState<AddonGroup | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<AddonGroup | null>(null)
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
          <h2 className="font-display text-2xl md:text-3xl text-accent">Adicionais</h2>
          <p className="font-body text-sm text-foreground/60">
            Grupos reutilizáveis de adicionais — vincule cada um aos produtos dentro do cadastro do produto.
            Arraste pra reordenar como aparecem no cardápio.
          </p>
        </div>
        {storeId && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/produtos')}>
              <ArrowLeft className="h-4 w-4" />
              Produtos
            </Button>
            <Button variant="outline" onClick={() => navigate('/produtos/variacoes')}>
              Variações
            </Button>
            <Button onClick={() => setIsCreating(true)}>Novo grupo</Button>
          </div>
        )}
      </div>

      {!storeId && <p className="font-body">Selecione uma loja pra ver os adicionais.</p>}
      {isLoading && <p className="font-body">Carregando...</p>}
      {error && <p className="font-body text-red-600">Erro ao carregar grupos de adicionais</p>}

      {groups && groups.length === 0 && (
        <div className={cardClass}>
          <p className="font-body text-foreground/70">Nenhum grupo de adicionais cadastrado ainda.</p>
        </div>
      )}

      {groups && groups.length > 0 && (
        <div className={tableCardClass}>
          <SortableList ids={groups.map((group) => group.id)} onReorder={handleReorder}>
            <div className="divide-y divide-secondary/10">
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
                            className="shrink-0 cursor-grab touch-none rounded-md p-1.5 text-foreground/40 hover:bg-secondary/10 hover:text-foreground active:cursor-grabbing"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={isExpanded ? `Recolher ${group.name}` : `Expandir ${group.name}`}
                            onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                            className="shrink-0 rounded-md p-1.5 text-foreground/50 hover:bg-secondary/10 hover:text-foreground"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          <span
                            className={`flex-1 py-2 font-body ${group.active ? '' : 'text-foreground/40 line-through'}`}
                          >
                            {group.name}
                          </span>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              aria-label={`Editar ${group.name}`}
                              onClick={() => setEditingGroup(group)}
                              className="rounded-md p-1.5 text-foreground/50 hover:bg-secondary/10 hover:text-foreground"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Excluir ${group.name}`}
                              onClick={() => setDeletingGroup(group)}
                              className="rounded-md p-1.5 text-foreground/50 hover:bg-red-700/10 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {isExpanded && <AddonOptionsPanel groupId={group.id} />}
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
          title="Excluir grupo de adicionais"
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
        <AddonGroupModal
          key={editingGroup.id}
          storeId={storeId}
          group={editingGroup}
          onClose={() => setEditingGroup(null)}
        />
      )}

      {isCreating && storeId && (
        <AddonGroupModal storeId={storeId} onClose={() => setIsCreating(false)} />
      )}
    </div>
  )
}
