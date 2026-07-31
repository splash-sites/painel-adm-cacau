import { supabase } from '../supabase/client'
import { AttendantInUseError } from '../../application/attendant/AttendantInUseError'
import type { AttendantInput, AttendantRepository } from '../../application/attendant/AttendantRepository'
import type { Attendant } from '../../domain/attendant/Attendant'

interface AttendantRow {
  id: string
  store_id: string
  name: string
  active: boolean
}

function toAttendant(row: AttendantRow): Attendant {
  return { id: row.id, storeId: row.store_id, name: row.name, active: row.active }
}

export class SupabaseAttendantRepository implements AttendantRepository {
  async list(storeId: string): Promise<Attendant[]> {
    const { data, error } = await supabase
      .from('attendants')
      .select('id, store_id, name, active')
      .eq('store_id', storeId)
      .order('name')

    if (error) throw new Error(error.message)
    return (data as AttendantRow[]).map(toAttendant)
  }

  async create(storeId: string, input: AttendantInput): Promise<Attendant> {
    const { data, error } = await supabase
      .from('attendants')
      .insert({ store_id: storeId, name: input.name, active: input.active })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Falha ao criar atendente')
    return toAttendant(data as AttendantRow)
  }

  async update(id: string, input: AttendantInput): Promise<void> {
    const { error } = await supabase
      .from('attendants')
      .update({ name: input.name, active: input.active })
      .eq('id', id)

    if (error) throw new Error(error.message)
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('attendants').delete().eq('id', id)
    if (error) {
      if (error.code === '23503') throw new AttendantInUseError()
      throw new Error(error.message)
    }
  }
}
