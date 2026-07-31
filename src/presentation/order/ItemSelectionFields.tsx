import { useEffect, useId, useState } from 'react'
import type { OrderItemAddonSelection } from '../../application/order/OrderRepository'
import { isValidAddonSelection } from '../../domain/product/addonPricing'
import { isValidVariationSelection } from '../../domain/product/variationPricing'
import { useAddonGroupList, useAddonOptionList, useProductAddonGroupList } from '../product/addons/useAddons'
import {
  useProductVariationGroupList,
  useVariationGroupList,
  useVariationOptionList,
} from '../product/variations/useVariations'
import { Checkbox } from '../ui/Checkbox'
import { Label } from '../ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select'

export interface ItemSelectionValue {
  variationOptionIds: string[]
  addons: OrderItemAddonSelection[]
}

function VariationGroupField({
  groupId,
  groupName,
  initialOptionIds,
  onChange,
}: {
  groupId: string
  groupName: string
  initialOptionIds: string[]
  onChange: (optionId: string) => void
}) {
  const { data: options } = useVariationOptionList(groupId)
  const [selected, setSelected] = useState('')
  const fieldId = useId()

  useEffect(() => {
    if (selected || !options) return
    const preSelected = options.find((option) => initialOptionIds.includes(option.id))
    if (preSelected) setSelected(preSelected.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options])

  useEffect(() => {
    onChange(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  return (
    <div className="space-y-1">
      <Label htmlFor={fieldId}>{groupName} *</Label>
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger id={fieldId}>
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          {options
            ?.filter((option) => option.active || option.id === selected)
            .map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function AddonGroupField({
  addonGroupId,
  selectionType,
  groupName,
  initialAddons,
  onChange,
}: {
  addonGroupId: string
  selectionType: 'single' | 'multiple'
  groupName: string
  initialAddons: OrderItemAddonSelection[]
  onChange: (selections: OrderItemAddonSelection[]) => void
}) {
  const { data: options } = useAddonOptionList(addonGroupId)
  const [quantityByOption, setQuantityByOption] = useState<Record<string, number>>({})
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (initialized || !options) return
    const optionIds = new Set(options.map((option) => option.id))
    const initial: Record<string, number> = {}
    for (const addon of initialAddons) {
      if (optionIds.has(addon.addonOptionId)) initial[addon.addonOptionId] = addon.quantity
    }
    setQuantityByOption(initial)
    setInitialized(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options])

  useEffect(() => {
    onChange(Object.entries(quantityByOption).map(([addonOptionId, quantity]) => ({ addonOptionId, quantity })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantityByOption])

  function toggle(optionId: string, checked: boolean) {
    setQuantityByOption((prev) => {
      if (!checked) {
        const { [optionId]: _removed, ...rest } = prev
        return rest
      }
      if (selectionType === 'single') return { [optionId]: 1 }
      return { ...prev, [optionId]: 1 }
    })
  }

  function setQuantity(optionId: string, quantity: number) {
    setQuantityByOption((prev) => ({ ...prev, [optionId]: Math.max(1, quantity) }))
  }

  return (
    <div className="space-y-2">
      <Label>{groupName}</Label>
      <ul className="space-y-2">
        {options
          ?.filter((option) => option.active)
          .map((option) => {
            const quantity = quantityByOption[option.id]
            const checked = quantity != null
            return (
              <li key={option.id} className="flex items-center gap-2">
                <Checkbox checked={checked} onCheckedChange={(value) => toggle(option.id, value === true)} />
                <span className="flex-1 font-body text-sm">{option.name}</span>
                {checked && selectionType === 'multiple' && (
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(option.id, Number(event.target.value))}
                    className="w-14 rounded-lg border border-secondary/25 bg-background px-2 py-1 text-sm"
                  />
                )}
              </li>
            )
          })}
      </ul>
    </div>
  )
}

/** Seletor de variação (obrigatória) e adicional (opcional) de um produto, pra add/editar item de pedido. */
export function ItemSelectionFields({
  storeId,
  productId,
  initialVariationOptionIds = [],
  initialAddons = [],
  onChange,
}: {
  storeId: string
  productId: string
  initialVariationOptionIds?: string[]
  initialAddons?: OrderItemAddonSelection[]
  onChange: (value: ItemSelectionValue, isValid: boolean) => void
}) {
  const { data: linkedVariationGroups } = useProductVariationGroupList(productId)
  const { data: linkedAddonGroups } = useProductAddonGroupList(productId)
  const { data: variationGroups } = useVariationGroupList(storeId)
  const { data: addonGroups } = useAddonGroupList(storeId)

  const [variationByGroup, setVariationByGroup] = useState<Record<string, string>>({})
  const [addonsByGroup, setAddonsByGroup] = useState<Record<string, OrderItemAddonSelection[]>>({})

  // Enquanto qualquer uma das 2 queries ainda não resolveu, não dá pra saber se o produto tem
  // grupo obrigatório vinculado — tratar como "sem grupo" (válido) liberaria o botão antes da hora.
  const isLoadingGroups = linkedVariationGroups === undefined || linkedAddonGroups === undefined

  useEffect(() => {
    const variationOptionIds = Object.values(variationByGroup).filter(Boolean)
    const addons = Object.values(addonsByGroup).flat()

    const variationValid = isValidVariationSelection(
      (linkedVariationGroups ?? []).map((link) => ({ variationGroupId: link.variationGroupId })),
      Object.entries(variationByGroup)
        .filter(([, optionId]) => optionId)
        .map(([groupId]) => ({ variationGroupId: groupId })),
    )

    const addonsValid = (linkedAddonGroups ?? []).every((link) =>
      isValidAddonSelection(
        { selectionType: link.selectionType, maxQuantity: link.maxQuantity },
        addonsByGroup[link.addonGroupId] ?? [],
      ),
    )

    onChange({ variationOptionIds, addons }, !isLoadingGroups && variationValid && addonsValid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variationByGroup, addonsByGroup, linkedVariationGroups, linkedAddonGroups, isLoadingGroups])

  if (!linkedVariationGroups || !linkedAddonGroups) return null
  if (!linkedVariationGroups.length && !linkedAddonGroups.length) return null

  return (
    <div className="space-y-4 rounded-lg bg-secondary/5 p-4">
      {linkedVariationGroups?.map((link) => (
        <VariationGroupField
          key={link.variationGroupId}
          groupId={link.variationGroupId}
          groupName={variationGroups?.find((group) => group.id === link.variationGroupId)?.name ?? '—'}
          initialOptionIds={initialVariationOptionIds}
          onChange={(optionId) =>
            setVariationByGroup((prev) => ({ ...prev, [link.variationGroupId]: optionId }))
          }
        />
      ))}
      {linkedAddonGroups?.map((link) => (
        <AddonGroupField
          key={link.addonGroupId}
          addonGroupId={link.addonGroupId}
          selectionType={link.selectionType}
          groupName={addonGroups?.find((group) => group.id === link.addonGroupId)?.name ?? '—'}
          initialAddons={initialAddons}
          onChange={(selections) =>
            setAddonsByGroup((prev) => ({ ...prev, [link.addonGroupId]: selections }))
          }
        />
      ))}
    </div>
  )
}
