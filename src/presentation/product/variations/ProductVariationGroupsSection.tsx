import { useState } from 'react'
import { ChevronDown, ChevronRight, GripVertical, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import type { VariationGroup } from '../../../domain/product/Variation'
import { Button } from '../../ui/Button'
import { Combobox } from '../../ui/Combobox'
import { SortableItem, SortableList } from '../../ui/SortableList'
import { VariationGroupModal } from './VariationGroupModal'
import { VariationOptionsPanel } from './VariationOptionsPanel'
import {
  useLinkVariationGroupToProduct,
  useProductVariationGroupList,
  useReorderProductVariationGroups,
  useUnlinkVariationGroupFromProduct,
  useVariationGroupList,
} from './useVariations'

function handleMutationError(error: unknown, fallback: string) {
  toast.error(error instanceof Error ? error.message : fallback)
}

type Props =
  | { storeId: string; mode: 'linked'; productId: string }
  | { storeId: string; mode: 'draft'; selectedGroupIds: string[]; onChange: (ids: string[]) => void }

/** Vincula grupo(s) de variação ao produto — busca pra achar/vincular existente, "+ Novo grupo" pra criar, arrasta pra ordenar as seções no cardápio. */
export function ProductVariationGroupsSection(props: Props) {
  const { storeId } = props
  const { data: groups } = useVariationGroupList(storeId)
  const { data: links } = useProductVariationGroupList(props.mode === 'linked' ? props.productId : undefined)
  const linkGroup = useLinkVariationGroupToProduct()
  const unlinkGroup = useUnlinkVariationGroupFromProduct()
  const reorderGroups = useReorderProductVariationGroups()
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)

  if (!groups) return null

  const groupById = new Map(groups.map((group) => [group.id, group]))
  const linkedGroupIds = props.mode === 'draft' ? props.selectedGroupIds : (links ?? []).map((link) => link.variationGroupId)
  const linkedIdSet = new Set(linkedGroupIds)
  const searchableOptions = groups
    .filter((group) => group.active && !linkedIdSet.has(group.id))
    .map((group) => ({ value: group.id, label: group.name }))

  function handleLink(variationGroupId: string) {
    if (props.mode === 'draft') {
      props.onChange([...props.selectedGroupIds, variationGroupId])
      return
    }
    linkGroup.mutate(
      { productId: props.productId, variationGroupId },
      { onError: (error) => handleMutationError(error, 'Falha ao vincular variação ao produto') },
    )
  }

  function handleUnlink(variationGroupId: string) {
    if (props.mode === 'draft') {
      props.onChange(props.selectedGroupIds.filter((id) => id !== variationGroupId))
      return
    }
    unlinkGroup.mutate(
      { productId: props.productId, variationGroupId },
      { onError: (error) => handleMutationError(error, 'Falha ao desvincular variação do produto') },
    )
  }

  function handleReorder(nextIds: string[]) {
    if (props.mode === 'draft') {
      props.onChange(nextIds)
      return
    }
    reorderGroups.mutate(
      { productId: props.productId, orderedVariationGroupIds: nextIds },
      { onError: (error) => handleMutationError(error, 'Falha ao reordenar variações') },
    )
  }

  function handleGroupCreated(group: VariationGroup) {
    setExpandedGroupId(group.id)
    handleLink(group.id)
  }

  return (
    <fieldset className="space-y-3 rounded-lg bg-secondary/5 p-3">
      <div className="flex items-center justify-between px-1">
        <legend className="text-sm font-body">Variações (obrigatório quando marcado)</legend>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsCreatingGroup(true)}
          className="h-7 gap-1 px-2 text-xs"
        >
          <Plus className="h-3 w-3" />
          Novo grupo
        </Button>
      </div>

      <Combobox
        options={searchableOptions}
        placeholder="Buscar grupo de variação..."
        emptyLabel="Nenhum grupo encontrado."
        onSelect={handleLink}
      />

      {linkedGroupIds.length === 0 && (
        <p className="px-1 font-body text-sm text-foreground/50">Nenhuma variação vinculada ainda.</p>
      )}

      {linkedGroupIds.length > 0 && (
        <SortableList ids={linkedGroupIds} onReorder={handleReorder}>
          <div className="space-y-2">
            {linkedGroupIds.map((groupId) => {
              const group = groupById.get(groupId)
              if (!group) return null
              const isExpanded = expandedGroupId === group.id
              return (
                <SortableItem key={group.id} id={group.id}>
                  {({ setActivatorNodeRef, attributes, listeners }) => (
                    <div className="rounded-md bg-background/60">
                      <div className="flex items-center gap-1 py-0.5">
                        <button
                          type="button"
                          ref={setActivatorNodeRef}
                          {...attributes}
                          {...listeners}
                          aria-label={`Arrastar ${group.name}`}
                          className="cursor-grab touch-none rounded-md p-1 text-foreground/40 hover:bg-secondary/10 hover:text-foreground active:cursor-grabbing"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
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
                        <span className="flex-1 font-body">{group.name}</span>
                        <button
                          type="button"
                          aria-label={`Desvincular ${group.name}`}
                          onClick={() => handleUnlink(group.id)}
                          className="rounded-md p-1.5 text-foreground/50 hover:bg-red-700/10 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {isExpanded && <VariationOptionsPanel groupId={group.id} />}
                    </div>
                  )}
                </SortableItem>
              )
            })}
          </div>
        </SortableList>
      )}

      {isCreatingGroup && (
        <VariationGroupModal
          storeId={storeId}
          onClose={() => setIsCreatingGroup(false)}
          onCreated={handleGroupCreated}
        />
      )}
    </fieldset>
  )
}
