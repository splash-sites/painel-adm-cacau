import { supabase } from '../supabase/client'
import type { TableSessionRepository } from '../../application/order/TableSessionRepository'

export class SupabaseTableSessionRepository implements TableSessionRepository {
  async listOpenIds(storeId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('table_sessions')
      .select('id')
      .eq('store_id', storeId)
      .eq('status', 'open')

    if (error) throw new Error(error.message)
    return (data as { id: string }[]).map((row) => row.id)
  }

  async close(id: string): Promise<void> {
    const { error } = await supabase.rpc('close_table_session', { p_session_id: id })
    if (error) throw new Error(error.message)
  }
}
