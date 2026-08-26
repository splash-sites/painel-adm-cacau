import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useEffectiveStoreId } from '../../storeContext/useEffectiveStoreId'
import type { VariationGroup } from '../../../domain/product/Variation'
import { Button } from '../../ui/Button'
import { ConfirmModal } from '../../ui/ConfirmModal'
import { cardClass, tableCardClass, tableHeaderCellClass, tableRowClass } from '../../ui/styles'
import { VariationGroupModal } from './VariationGroupModal'
import { VariationOptionsPanel } from './VariationOptionsPanel'
import { useDeleteVariationGroup, useVariationGroupList } from './useVariations'

export function VariationGroupListPage() {
  const storeId = useEffectiveStoreId()
  const navigate = useNavigate()
  const { data: groups, isLoading, error } = useVariationGroupList(storeId ?? '')
  const deleteGroup = useDeleteVariationGroup()
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl md:text-3xl text-accent">Variações</h2>
          <p className="font-body text-sm text-foreground/60">
            Grupos reutilizáveis de variação (ex: sabor, intensidade) — sempre obrigatórios quando vinculados a um
            produto. Vincule cada um dentro do cadastro do produto.
          </p>
        </div>
        {storeId && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/produtos')}>
              ← Produtos
            </Button>
            <Button variant="outline" onClick={() => navigate('/produtos/adicionais')}>
              Adicionais
            </Button>
            <Button onClick={() => setIsCreating(true)}>Novo grupo</Button>
          </div>
        )}
      </div>

      {!storeId && <p className="font-body">Selecione uma loja pra ver as variações.</p>}
      {isLoading && <p className="font-body">Carregando...</p>}
      {error && <p className="font-body text-red-600">Erro ao carregar grupos de variação</p>}

      {groups && groups.length === 0 && (
        <div className={cardClass}>
          <p className="font-body text-foreground/70">Nenhum grupo de variação cadastrado ainda.</p>
        </div>
      )}

      {groups && groups.length > 0 && (
        <div className={tableCardClass}>
          <table className="w-full text-left font-body">
            <thead>
              <tr className="h-11">
                <th className={`${tableHeaderCellClass} w-10 pl-6`}></th>
                <th className={tableHeaderCellClass}>Nome</th>
                <th className={tableHeaderCellClass}>Efeito no preço</th>
                <th className={`${tableHeaderCellClass} pr-6`}></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const isExpanded = expandedGroupId === group.id
                return (
                  <Fragment key={group.id}>
                    <tr className={tableRowClass}>
                      <td className="py-3 pl-6">
                        <button
                          type="button"
                          aria-label={isExpanded ? `Recolher ${group.name}` : `Expandir ${group.name}`}
                          onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                          className="rounded-md p-1 text-foreground/50 hover:bg-secondary/10 hover:text-foreground"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3">
                        <span className={group.active ? '' : 'text-foreground/40 line-through'}>
                          {group.name}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-foreground/60">
                        {group.priceMode === 'replace' ? 'Substitui o preço base' : 'Soma ao preço base'}
                      </td>
                      <td className="py-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
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
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={4} className="p-0">
                          <VariationOptionsPanel groupId={group.id} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
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
