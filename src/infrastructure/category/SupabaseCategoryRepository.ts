import { supabase } from '../supabase/client'
import { CategoryInUseError } from '../../application/category/CategoryInUseError'
import type { CategoryInput, CategoryRepository } from '../../application/category/CategoryRepository'
import type { Category } from '../../domain/category/Category'

interface CategoryRow {
  id: string
  store_id: string
  name: string
  active: boolean
}

function toCategory(row: CategoryRow): Category {
  return { id: row.id, storeId: row.store_id, name: row.name, active: row.active }
}

export class SupabaseCategoryRepository implements CategoryRepository {
  async list(storeId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('id, store_id, name, active')
      .eq('store_id', storeId)
      .order('name')

    if (error) throw new Error(error.message)
    return (data as CategoryRow[]).map(toCategory)
  }

  async create(storeId: string, input: CategoryInput): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert({ store_id: storeId, name: input.name, active: input.active })
      .select()
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
}
