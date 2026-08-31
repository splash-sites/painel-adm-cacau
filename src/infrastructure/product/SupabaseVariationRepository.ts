import { supabase } from '../supabase/client'
import type {
  VariationGroupInput,
  VariationOptionInput,
  VariationRepository,
} from '../../application/product/VariationRepository'
import type {
  ProductVariationGroup,
  VariationGroup,
  VariationOption,
  VariationPriceMode,
} from '../../domain/product/Variation'

interface VariationGroupRow {
  id: string
  store_id: string
  name: string
  active: boolean
  price_mode: VariationPriceMode
  sort_order: number
}

interface VariationOptionRow {
  id: string
  group_id: string
  name: string
  price: number
  lover_price: number | null
  active: boolean
  sort_order: number
}

interface ProductVariationGroupRow {
  product_id: string
  variation_group_id: string
  sort_order: number
}

function toVariationGroup(row: VariationGroupRow): VariationGroup {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    active: row.active,
    priceMode: row.price_mode,
    sortOrder: row.sort_order,
  }
}

function toVariationOption(row: VariationOptionRow): VariationOption {
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

function toProductVariationGroup(row: ProductVariationGroupRow): ProductVariationGroup {
  return { productId: row.product_id, variationGroupId: row.variation_group_id, sortOrder: row.sort_order }
}

export class SupabaseVariationRepository implements VariationRepository {
  async listGroups(storeId: string): Promise<VariationGroup[]> {
    const { data, error } = await supabase
      .from('variation_groups')
      .select('id, store_id, name, active, price_mode, sort_order')
      .eq('store_id', storeId)
      .order('sort_order')
      .order('name') // desempate estável se 2 grupos ficarem com o mesmo sort_order

    if (error) throw new Error(error.message)
    return (data as VariationGroupRow[]).map(toVariationGroup)
  }

  async createGroup(storeId: string, input: VariationGroupInput): Promise<VariationGroup> {
    const { data: existing, error: fetchError } = await supabase
      .from('variation_groups')
      .select('sort_order')
      .eq('store_id', storeId)

    if (fetchError) throw new Error(fetchError.message)
    const sortOrder = (existing ?? []).reduce((max, row) => Math.max(max, row.sort_order), -1) + 1

    const { data, error } = await supabase
      .from('variation_groups')
      .insert({
        store_id: storeId,
        name: input.name,
        active: input.active,
        price_mode: input.priceMode,
        sort_order: sortOrder,
      })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Falha ao criar grupo de variação')
    return toVariationGroup(data as VariationGroupRow)
  }

  async updateGroup(id: string, input: VariationGroupInput): Promise<void> {
    const { error } = await supabase
      .from('variation_groups')
      .update({ name: input.name, active: input.active, price_mode: input.priceMode })
      .eq('id', id)

    if (error) throw new Error(error.message)
  }

  async deleteGroup(id: string): Promise<void> {
    const { error } = await supabase.from('variation_groups').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async reorderGroups(storeId: string, orderedGroupIds: string[]): Promise<void> {
    // Upsert em lote precisa do row inteiro (name/active/price_mode são NOT NULL — upsert parcial
    // falha no ON CONFLICT DO UPDATE, mesmo cuidado já documentado em product_addon_groups).
    const { data, error: fetchError } = await supabase
      .from('variation_groups')
      .select('id, store_id, name, active, price_mode, sort_order')
      .eq('store_id', storeId)

    if (fetchError) throw new Error(fetchError.message)

    const rowById = new Map((data as VariationGroupRow[]).map((row) => [row.id, row]))
    const payload = orderedGroupIds.map((id, index) => {
      const row = rowById.get(id)
      if (!row) throw new Error('Grupo de variação não encontrado nessa loja')
      return { ...row, sort_order: index }
    })

    const { error } = await supabase.from('variation_groups').upsert(payload)
    if (error) throw new Error(error.message)
  }

  async listOptions(groupId: string): Promise<VariationOption[]> {
    const { data, error } = await supabase
      .from('variation_options')
      .select('id, group_id, name, price, lover_price, active, sort_order')
      .eq('group_id', groupId)
      .order('sort_order')
      .order('name') // desempate estável se 2 opções ficarem com o mesmo sort_order

    if (error) throw new Error(error.message)
    return (data as VariationOptionRow[]).map(toVariationOption)
  }

  async createOption(groupId: string, input: VariationOptionInput): Promise<VariationOption> {
    const { data: existing, error: fetchError } = await supabase
      .from('variation_options')
      .select('sort_order')
      .eq('group_id', groupId)

    if (fetchError) throw new Error(fetchError.message)
    const sortOrder = (existing ?? []).reduce((max, row) => Math.max(max, row.sort_order), -1) + 1

    const { data, error } = await supabase
      .from('variation_options')
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

    if (error || !data) throw new Error(error?.message ?? 'Falha ao criar variação')
    return toVariationOption(data as VariationOptionRow)
  }

  async updateOption(id: string, input: VariationOptionInput): Promise<void> {
    const { error } = await supabase
      .from('variation_options')
      .update({ name: input.name, price: input.price, lover_price: input.loverPrice, active: input.active })
      .eq('id', id)

    if (error) throw new Error(error.message)
  }

  async deleteOption(id: string): Promise<void> {
    const { error } = await supabase.from('variation_options').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async reorderOptions(groupId: string, orderedOptionIds: string[]): Promise<void> {
    // Mesmo cuidado de reorderGroups — upsert em lote precisa do row inteiro.
    const { data, error: fetchError } = await supabase
      .from('variation_options')
      .select('id, group_id, name, price, lover_price, active, sort_order')
      .eq('group_id', groupId)

    if (fetchError) throw new Error(fetchError.message)

    const rowById = new Map((data as VariationOptionRow[]).map((row) => [row.id, row]))
    const payload = orderedOptionIds.map((id, index) => {
      const row = rowById.get(id)
      if (!row) throw new Error('Variação não encontrada nesse grupo')
      return { ...row, sort_order: index }
    })

    const { error } = await supabase.from('variation_options').upsert(payload)
    if (error) throw new Error(error.message)
  }

  async listProductVariationGroups(productId: string): Promise<ProductVariationGroup[]> {
    const { data, error } = await supabase
      .from('product_variation_groups')
      .select('product_id, variation_group_id, sort_order')
      .eq('product_id', productId)
      .order('sort_order')
      .order('variation_group_id') // desempate estável se 2 linhas ficarem com o mesmo sort_order (ver linkGroupToProduct)

    if (error) throw new Error(error.message)
    return (data as ProductVariationGroupRow[]).map(toProductVariationGroup)
  }

  async linkGroupToProduct(productId: string, variationGroupId: string): Promise<void> {
    // 1 leitura só (em vez de buscar o max separado) — reduz a janela de corrida entre 2 vínculos
    // concorrentes calculando o mesmo "próximo sort_order" (pior caso: 2 grupos empatam na ordem).
    const { data: rows, error: fetchError } = await supabase
      .from('product_variation_groups')
      .select('sort_order')
      .eq('product_id', productId)

    if (fetchError) throw new Error(fetchError.message)

    const nextSortOrder = (rows ?? []).reduce((max, row) => Math.max(max, row.sort_order), -1) + 1

    const { error } = await supabase
      .from('product_variation_groups')
      .upsert({ product_id: productId, variation_group_id: variationGroupId, sort_order: nextSortOrder })

    if (error) throw new Error(error.message)
  }

  async unlinkGroupFromProduct(productId: string, variationGroupId: string): Promise<void> {
    const { error } = await supabase
      .from('product_variation_groups')
      .delete()
      .eq('product_id', productId)
      .eq('variation_group_id', variationGroupId)

    if (error) throw new Error(error.message)
  }

  async reorderProductVariationGroups(productId: string, orderedVariationGroupIds: string[]): Promise<void> {
    // Upsert em 1 lote — tabela só tem essas 3 colunas, então já dá pro payload completo sem precisar buscar antes.
    const payload = orderedVariationGroupIds.map((variationGroupId, index) => ({
      product_id: productId,
      variation_group_id: variationGroupId,
      sort_order: index,
    }))

    const { error } = await supabase.from('product_variation_groups').upsert(payload)
    if (error) throw new Error(error.message)
  }
}
