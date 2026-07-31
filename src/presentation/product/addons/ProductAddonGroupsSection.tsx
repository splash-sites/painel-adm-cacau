import { useState } from 'react'
import { ChevronDown, ChevronRight, GripVertical, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import type { AddonGroup, AddonSelectionType } from '../../../domain/product/Addon'
import { AddonGroupModal } from './AddonGroupModal'
import { AddonOptionsPanel } from './AddonOptionsPanel'
import { Button } from '../../ui/Button'
import { Combobox } from '../../ui/Combobox'
import { Input } from '../../ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/Select'
import { SortableItem, SortableList } from '../../ui/SortableList'
import {
  useAddonGroupList,
  useLinkAddonGroupToProduct,
  useProductAddonGroupList,
  useReorderProductAddonGroups,
  useUnlinkAddonGroupFromProduct,
} from './useAddons'

function handleMutationError(error: unknown, fallback: string) {
  toast.error(error instanceof Error ? error.message : fallback)
}

export interface DraftAddonLink {
  addonGroupId: string
  selectionType: AddonSelectionType
  maxQuantity: number | null
}

type LinkConfig = { selectionType: AddonSelectionType; maxQuantity: number | null }

type Props =
  | { storeId: string; mode: 'linked'; productId: string }
  | { storeId: string; mode: 'draft'; links: DraftAddonLink[]; onChange: (links: DraftAddonLink[]) => void }

/** Vincula grupo(s) de adicionais ao produto — busca pra achar/vincular existente, "+ Novo grupo" pra criar, arrasta pra ordenar as seções no cardápio. */
export function ProductAddonGroupsSection(props: Props) {
  const { storeId } = props
  const { data: groups } = useAddonGroupList(storeId)
  const { data: links } = useProductAddonGroupList(props.mode === 'linked' ? props.productId : undefined)
  const linkGroup = useLinkAddonGroupToProduct()
  const unlinkGroup = useUnlinkAddonGroupFromProduct()
  const reorderGroups = useReorderProductAddonGroups()
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)

  if (!groups) return null

  const groupById = new Map(groups.map((group) => [group.id, group]))

  const draftLinks = props.mode === 'draft' ? props.links : []
  const linkedByGroupId: Map<string, LinkConfig> =
    props.mode === 'draft'
      ? new Map(draftLinks.map((link) => [link.addonGroupId, link]))
      : new Map((links ?? []).map((link) => [link.addonGroupId, link]))

  const linkedGroupIds =
    props.mode === 'draft' ? draftLinks.map((link) => link.addonGroupId) : (links ?? []).map((link) => link.addonGroupId)

  const linkedIdSet = new Set(linkedGroupIds)
  const searchableOptions = groups
    .filter((group) => group.active && !linkedIdSet.has(group.id))
    .map((group) => ({ value: group.id, label: group.name }))

  function setDraftLink(addonGroupId: string, config: LinkConfig | null) {
    if (props.mode !== 'draft') return
    const withoutGroup = props.links.filter((link) => link.addonGroupId !== addonGroupId)
    props.onChange(config ? [...withoutGroup, { addonGroupId, ...config }] : withoutGroup)
  }

  function handleLink(addonGroupId: string) {
    if (props.mode === 'draft') {
      setDraftLink(addonGroupId, { selectionType: 'single', maxQuantity: null })
      return
    }
    linkGroup.mutate(
      { productId: props.productId, addonGroupId, input: { selectionType: 'single', maxQuantity: null } },
      { onError: (error) => handleMutationError(error, 'Falha ao vincular grupo ao produto') },
    )
  }

  function handleUnlink(addonGroupId: string) {
    if (props.mode === 'draft') {
      setDraftLink(addonGroupId, null)
      return
    }
    unlinkGroup.mutate(
      { productId: props.productId, addonGroupId },
      { onError: (error) => handleMutationError(error, 'Falha ao desvincular grupo do produto') },
    )
  }

  function handleSelectionTypeChange(addonGroupId: string, selectionType: AddonSelectionType) {
    const current = linkedByGroupId.get(addonGroupId)
    if (props.mode === 'draft') {
      setDraftLink(addonGroupId, { selectionType, maxQuantity: current?.maxQuantity ?? null })
      return
    }
    linkGroup.mutate(
      { productId: props.productId, addonGroupId, input: { selectionType, maxQuantity: current?.maxQuantity ?? null } },
      { onError: (error) => handleMutationError(error, 'Falha ao atualizar tipo de seleção') },
    )
  }

  function handleMaxQuantityChange(addonGroupId: string, value: string) {
    const current = linkedByGroupId.get(addonGroupId)
    if (!current) return
    const maxQuantity = value === '' ? null : Math.max(1, Number(value))

    if (props.mode === 'draft') {
      setDraftLink(addonGroupId, { selectionType: current.selectionType, maxQuantity })
      return
    }
    linkGroup.mutate(
      { productId: props.productId, addonGroupId, input: { selectionType: current.selectionType, maxQuantity } },
      { onError: (error) => handleMutationError(error, 'Falha ao atualizar limite de quantidade') },
    )
  }

  function handleReorder(nextIds: string[]) {
    if (props.mode === 'draft') {
      const byId = new Map(draftLinks.map((link) => [link.addonGroupId, link]))
      props.onChange(nextIds.map((id) => byId.get(id)).filter((link): link is DraftAddonLink => !!link))
      return
    }
    reorderGroups.mutate(
      { productId: props.productId, orderedAddonGroupIds: nextIds },
      { onError: (error) => handleMutationError(error, 'Falha ao reordenar adicionais') },
    )
  }

  function handleGroupCreated(group: AddonGroup) {
    setExpandedGroupId(group.id)
    handleLink(group.id)
  }

  return (
    <fieldset className="space-y-3 rounded-lg bg-secondary/5 p-3">
      <div className="flex items-center justify-between px-1">
        <legend className="text-sm font-body">Adicionais</legend>
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
        placeholder="Buscar grupo de adicionais..."
        emptyLabel="Nenhum grupo encontrado."
        onSelect={handleLink}
      />

      {linkedGroupIds.length === 0 && (
        <p className="px-1 font-body text-sm text-foreground/50">Nenhum adicional vinculado ainda.</p>
      )}

      {linkedGroupIds.length > 0 && (
        <SortableList ids={linkedGroupIds} onReorder={handleReorder}>
          <div className="space-y-2">
            {linkedGroupIds.map((groupId) => {
              const group = groupById.get(groupId)
              const link = linkedByGroupId.get(groupId)
              if (!group || !link) return null
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

                      <div className="flex items-center gap-3 pb-2 pl-9">
                        <Select
                          value={link.selectionType}
                          onValueChange={(value) =>
                            handleSelectionTypeChange(group.id, value as AddonSelectionType)
                          }
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Escolha única</SelectItem>
                            <SelectItem value="multiple">Múltipla escolha</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          key={`${group.id}-${link.maxQuantity}`}
                          type="number"
                          min={1}
                          step={1}
                          placeholder="Sem limite"
                          defaultValue={link.maxQuantity ?? ''}
                          onBlur={(event) => handleMaxQuantityChange(group.id, event.target.value)}
                          className="w-32"
                        />
                      </div>

                      {isExpanded && <AddonOptionsPanel groupId={group.id} />}
                    </div>
                  )}
                </SortableItem>
              )
            })}
          </div>
        </SortableList>
      )}

      {isCreatingGroup && (
        <AddonGroupModal storeId={storeId} onClose={() => setIsCreatingGroup(false)} onCreated={handleGroupCreated} />
      )}
    </fieldset>
  )
}
