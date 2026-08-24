import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../supabase/client'
import type {
  AdminUser,
  AdminUserProfileUpdateInput,
  AdminUserRepository,
  AdminUserUpdateInput,
} from '../../application/admin/AdminUserRepository'

/** supabase-js só põe "Edge Function returned a non-2xx status code" em error.message — o corpo real vem em error.context (Response). */
async function functionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (body?.error) return body.error
    } catch {
      // corpo não era JSON, cai pro fallback abaixo
    }
  }
  return error instanceof Error ? error.message : 'Erro desconhecido'
}

interface AdminUserRow {
  id: string
  full_name: string | null
  email: string | null
  role: 'super_admin' | 'store_admin'
  store_id: string | null
  active: boolean
}

function toAdminUser(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    storeId: row.store_id,
    active: row.active,
  }
}

export class SupabaseAdminUserRepository implements AdminUserRepository {
  async list(): Promise<AdminUser[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, store_id, active')
      .in('role', ['super_admin', 'store_admin'])
      .order('full_name')

    if (error) throw new Error(error.message)
    return (data as AdminUserRow[]).map(toAdminUser)
  }

  async getById(id: string): Promise<AdminUser | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, store_id, active')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return toAdminUser(data as AdminUserRow)
  }

  async update(id: string, input: AdminUserUpdateInput): Promise<void> {
    const { error } = await supabase.rpc('set_admin_active', { p_user_id: id, p_active: input.active })

    if (error) throw new Error(error.message)
  }

  async updateProfile(id: string, input: AdminUserProfileUpdateInput): Promise<void> {
    const { data, error } = await supabase.functions.invoke('update-admin-user', {
      body: { userId: id, fullName: input.fullName, email: input.email, password: input.password || undefined },
    })

    if (error) throw new Error(await functionErrorMessage(error))
    if (data?.error) throw new Error(data.error)
  }

  async remove(id: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('delete-admin-user', {
      body: { userId: id },
    })

    if (error) throw new Error(await functionErrorMessage(error))
    if (data?.error) throw new Error(data.error)
  }
}
