import { supabase } from '../supabase/client'
import type {
  AddonGroupInput,
  AddonOptionInput,
  AddonRepository,
  ProductAddonGroupInput,
} from '../../application/product/AddonRepository'
import type { AddonGroup, AddonOption, ProductAddonGroup } from '../../domain/product/Addon'

interface AddonGroupRow {
  id: string
  store_id: string
  name: string
  active: boolean
  sort_order: number
}

interface AddonOptionRow {
  id: string
  group_id: string
  name: string
  price: number
  lover_price: number | null
  active: boolean
  sort_order: number
}

interface ProductAddonGroupRow {
  product_id: string
  addon_group_id: string
  selection_type: 'single' | 'multiple'
  max_quantity: number | null
  sort_order: number
}

function toAddonGroup(row: AddonGroupRow): AddonGroup {
  return { id: row.id, storeId: row.store_id, name: row.name, active: row.active, sortOrder: row.sort_order }
}

function toAddonOption(row: AddonOptionRow): AddonOption {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    price: row.price,
    loverPrice: row.lover_price,
    active: row.active,
    sortOrder: row.sort_order,
  }
}

function toProductAddonGroup(row: ProductAddonGroupRow): ProductAddonGroup {
  return {
    productId: row.product_id,
    addonGroupId: row.addon_group_id,
    selectionType: row.selection_type,
    maxQuantity: row.max_quantity,
    sortOrder: row.sort_order,
  }
}

export class SupabaseAddonRepository implements AddonRepository {
  async listGroups(storeId: string): Promise<AddonGroup[]> {
    const { data, error } = await supabase
      .from('addon_groups')
      .select('id, store_id, name, active, sort_order')
      .eq('store_id', storeId)
      .order('sort_order')
      .order('name') // desempate estável se 2 grupos ficarem com o mesmo sort_order

    if (error) throw new Error(error.message)
    return (data as AddonGroupRow[]).map(toAddonGroup)
  }

  async createGroup(storeId: string, input: AddonGroupInput): Promise<AddonGroup> {
    const { data: existing, error: fetchError } = await supabase
      .from('addon_groups')
      .select('sort_order')
      .eq('store_id', storeId)

    if (fetchError) throw new Error(fetchError.message)
    const sortOrder = (existing ?? []).reduce((max, row) => Math.max(max, row.sort_order), -1) + 1

    const { data, error } = await supabase
      .from('addon_groups')
      .insert({ store_id: storeId, name: input.name, active: input.active, sort_order: sortOrder })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Falha ao criar grupo de adicionais')
    return toAddonGroup(data as AddonGroupRow)
  }

  async updateGroup(id: string, input: AddonGroupInput): Promise<void> {
    const { error } = await supabase
      .from('addon_groups')
      .update({ name: input.name, active: input.active })
      .eq('id', id)

    if (error) throw new Error(error.message)
  }

  async deleteGroup(id: string): Promise<void> {
    const { error } = await supabase.from('addon_groups').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async reorderGroups(storeId: string, orderedGroupIds: string[]): Promise<void> {
    // Upsert em lote precisa do row inteiro (name/active são NOT NULL — upsert parcial falha no
    // ON CONFLICT DO UPDATE, mesmo cuidado já documentado em product_addon_groups).
    const { data, error: fetchError } = await supabase
      .from('addon_groups')
      .select('id, store_id, name, active, sort_order')
      .eq('store_id', storeId)

    if (fetchError) throw new Error(fetchError.message)

    const rowById = new Map((data as AddonGroupRow[]).map((row) => [row.id, row]))
    const payload = orderedGroupIds.map((id, index) => {
      const row = rowById.get(id)
      if (!row) throw new Error('Grupo de adicional não encontrado nessa loja')
      return { ...row, sort_order: index }
    })

    const { error } = await supabase.from('addon_groups').upsert(payload)
    if (error) throw new Error(error.message)
  }

  async listOptions(groupId: string): Promise<AddonOption[]> {
    const { data, error } = await supabase
      .from('addon_options')
      .select('id, group_id, name, price, lover_price, active, sort_order')
      .eq('group_id', groupId)
      .order('sort_order')
      .order('name') // desempate estável se 2 opções ficarem com o mesmo sort_order

    if (error) throw new Error(error.message)
    return (data as AddonOptionRow[]).map(toAddonOption)
  }

  async createOption(groupId: string, input: AddonOptionInput): Promise<AddonOption> {
    const { data: existing, error: fetchError } = await supabase
      .from('addon_options')
      .select('sort_order')
      .eq('group_id', groupId)

    if (fetchError) throw new Error(fetchError.message)
    const sortOrder = (existing ?? []).reduce((max, row) => Math.max(max, row.sort_order), -1) + 1

    const { data, error } = await supabase
      .from('addon_options')
      .insert({
        group_id: groupId,
        name: input.name,
        price: input.price,
        lover_price: input.loverPrice,
        active: input.active,
        sort_order: sortOrder,
      })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Falha ao criar adicional')
    return toAddonOption(data as AddonOptionRow)
  }

  async updateOption(id: string, input: AddonOptionInput): Promise<void> {
    const { error } = await supabase
      .from('addon_options')
      .update({ name: input.name, price: input.price, lover_price: input.loverPrice, active: input.active })
      .eq('id', id)

    if (error) throw new Error(error.message)
  }

  async deleteOption(id: string): Promise<void> {
    const { error } = await supabase.from('addon_options').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async reorderOptions(groupId: string, orderedOptionIds: string[]): Promise<void> {
    // Mesmo cuidado de reorderGroups — upsert em lote precisa do row inteiro.
    const { data, error: fetchError } = await supabase
      .from('addon_options')
      .select('id, group_id, name, price, lover_price, active, sort_order')
      .eq('group_id', groupId)

    if (fetchError) throw new Error(fetchError.message)

    const rowById = new Map((data as AddonOptionRow[]).map((row) => [row.id, row]))
    const payload = orderedOptionIds.map((id, index) => {
      const row = rowById.get(id)
      if (!row) throw new Error('Adicional não encontrado nesse grupo')
      return { ...row, sort_order: index }
    })

    const { error } = await supabase.from('addon_options').upsert(payload)
    if (error) throw new Error(error.message)
  }

  async listProductAddonGroups(productId: string): Promise<ProductAddonGroup[]> {
    const { data, error } = await supabase
      .from('product_addon_groups')
      .select('product_id, addon_group_id, selection_type, max_quantity, sort_order')
      .eq('product_id', productId)
      .order('sort_order')
      .order('addon_group_id') // desempate estável se 2 linhas ficarem com o mesmo sort_order (ver linkGroupToProduct)

    if (error) throw new Error(error.message)
    return (data as ProductAddonGroupRow[]).map(toProductAddonGroup)
  }

  async linkGroupToProduct(
    productId: string,
    addonGroupId: string,
    input: ProductAddonGroupInput,
  ): Promise<void> {
    // 1 leitura só (em vez de 2 sequenciais) — reduz a janela de corrida entre 2 vínculos concorrentes
    // calculando o mesmo "próximo sort_order" (pior caso: 2 grupos empatam na ordem, não quebra nada).
    const { data: rows, error: fetchError } = await supabase
      .from('product_addon_groups')
      .select('addon_group_id, sort_order')
      .eq('product_id', productId)

    if (fetchError) throw new Error(fetchError.message)

    const existing = (rows ?? []).find((row) => row.addon_group_id === addonGroupId)
    const sortOrder = existing
      ? existing.sort_order
      : (rows ?? []).reduce((max, row) => Math.max(max, row.sort_order), -1) + 1

    const { error } = await supabase.from('product_addon_groups').upsert({
      product_id: productId,
      addon_group_id: addonGroupId,
      selection_type: input.selectionType,
      max_quantity: input.maxQuantity,
      sort_order: sortOrder,
    })

    if (error) throw new Error(error.message)
  }

  async unlinkGroupFromProduct(productId: string, addonGroupId: string): Promise<void> {
    const { error } = await supabase
      .from('product_addon_groups')
      .delete()
      .eq('product_id', productId)
      .eq('addon_group_id', addonGroupId)

    if (error) throw new Error(error.message)
  }

  async reorderProductAddonGroups(productId: string, orderedAddonGroupIds: string[]): Promise<void> {
    // Upsert em 1 lote precisa do row inteiro (selection_type é NOT NULL — upsert parcial falha no
    // ON CONFLICT DO UPDATE, confirmado testando direto contra o banco), por isso busca antes.
    const { data, error: fetchError } = await supabase
      .from('product_addon_groups')
      .select('product_id, addon_group_id, selection_type, max_quantity, sort_order')
      .eq('product_id', productId)

    if (fetchError) throw new Error(fetchError.message)

    const rowByGroupId = new Map((data as ProductAddonGroupRow[]).map((row) => [row.addon_group_id, row]))
    const payload = orderedAddonGroupIds.map((addonGroupId, index) => {
      const row = rowByGroupId.get(addonGroupId)
      if (!row) throw new Error('Grupo de adicional não vinculado a esse produto')
      return { ...row, sort_order: index }
    })

    const { error } = await supabase.from('product_addon_groups').upsert(payload)
    if (error) throw new Error(error.message)
  }
}
