import { supabase } from '../supabase/client'
import type {
  StoreInput,
  StoreListParams,
  StoreListResult,
  StoreRepository,
} from '../../application/store/StoreRepository'
import { StoreInUseError } from '../../application/store/StoreInUseError'
import type { Store } from '../../domain/store/Store'

interface StoreRow {
  id: string
  name: string
  slug: string
  active: boolean
  supports_dine_in: boolean
  supports_pickup: boolean
  supports_delivery: boolean
  reseller_enabled: boolean
  whatsapp_number: string | null
}

function toStore(row: StoreRow): Store {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: row.active,
    supportsDineIn: row.supports_dine_in,
    supportsPickup: row.supports_pickup,
    supportsDelivery: row.supports_delivery,
    resellerEnabled: row.reseller_enabled,
    whatsappNumber: row.whatsapp_number,
  }
}

function toRow(input: StoreInput) {
  return {
    name: input.name,
    slug: input.slug,
    active: input.active,
    supports_dine_in: input.supportsDineIn,
    supports_pickup: input.supportsPickup,
    supports_delivery: input.supportsDelivery,
    reseller_enabled: input.resellerEnabled,
    whatsapp_number: input.whatsappNumber,
  }
}

export class SupabaseStoreRepository implements StoreRepository {
  async list({ page, pageSize }: StoreListParams): Promise<StoreListResult> {
    const from = page * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
      .from('stores')
      .select('*', { count: 'exact' })
      .order('name')
      .range(from, to)

    if (error) throw new Error(error.message)

    return { items: (data as StoreRow[]).map(toStore), total: count ?? 0 }
  }

  async getById(id: string): Promise<Store | null> {
    const { data, error } = await supabase.from('stores').select('*').eq('id', id).single()
    if (error || !data) return null
    return toStore(data as StoreRow)
  }

  async create(input: StoreInput): Promise<Store> {
    const { data, error } = await supabase.from('stores').insert(toRow(input)).select().single()
    if (error || !data) throw new Error(error?.message ?? 'Falha ao criar loja')
    return toStore(data as StoreRow)
  }

  async update(id: string, input: StoreInput): Promise<Store> {
    const { data, error } = await supabase
      .from('stores')
      .update(toRow(input))
      .eq('id', id)
      .select()
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Falha ao atualizar loja')
    return toStore(data as StoreRow)
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('stores').delete().eq('id', id)
    if (error) {
      if (error.code === '23503') throw new StoreInUseError()
      throw new Error(error.message)
    }
  }
}
