import { supabase } from '../supabase/client'
import { CategoryInUseError } from '../../application/category/CategoryInUseError'
import type { CategoryInput, CategoryRepository } from '../../application/category/CategoryRepository'
import type { Category } from '../../domain/category/Category'

interface CategoryRow {
  id: string
  store_id: string
  name: string
  active: boolean
  sort_order: number
}

function toCategory(row: CategoryRow): Category {
  return { id: row.id, storeId: row.store_id, name: row.name, active: row.active, sortOrder: row.sort_order }
}

const CATEGORY_SELECT = 'id, store_id, name, active, sort_order'

export class SupabaseCategoryRepository implements CategoryRepository {
  async list(storeId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select(CATEGORY_SELECT)
      .eq('store_id', storeId)
      .order('sort_order')
      .order('name')

    if (error) throw new Error(error.message)
    return (data as CategoryRow[]).map(toCategory)
  }

  async create(storeId: string, input: CategoryInput): Promise<Category> {
    const { data: lastRow, error: maxError } = await supabase
      .from('categories')
      .select('sort_order')
      .eq('store_id', storeId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (maxError) throw new Error(maxError.message)
    const sortOrder = lastRow ? lastRow.sort_order + 1 : 0

    const { data, error } = await supabase
      .from('categories')
      .insert({ store_id: storeId, name: input.name, active: input.active, sort_order: sortOrder })
      .select(CATEGORY_SELECT)
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Falha ao criar categoria')
    return toCategory(data as CategoryRow)
  }

  async update(id: string, input: CategoryInput): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .update({ name: input.name, active: input.active })
      .eq('id', id)

    if (error) throw new Error(error.message)
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) {
      if (error.code === '23503') throw new CategoryInUseError()
      throw new Error(error.message)
    }
  }

  async reorder(storeId: string, orderedIds: string[]): Promise<void> {
    // Upsert em 1 lote precisa do row inteiro (name/store_id são NOT NULL — upsert parcial
    // falha no ON CONFLICT DO UPDATE, mesmo caso já confirmado em promotions/product_addon_groups).
    const { data, error: fetchError } = await supabase
      .from('categories')
      .select(CATEGORY_SELECT)
      .eq('store_id', storeId)

    if (fetchError) throw new Error(fetchError.message)

    const rowById = new Map((data as CategoryRow[]).map((row) => [row.id, row]))
    const payload = orderedIds.map((id, index) => {
      const row = rowById.get(id)
      if (!row) throw new Error('Categoria não encontrada nessa loja')
      return { ...row, sort_order: index }
    })

    const { error } = await supabase.from('categories').upsert(payload)
    if (error) throw new Error(error.message)
  }
}
