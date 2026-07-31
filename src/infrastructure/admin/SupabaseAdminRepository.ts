import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../supabase/client'
import type {
  AdminRepository,
  CreateAdminPayload,
  SetupFirstAdminPayload,
} from '../../application/admin/AdminRepository'

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

export class SupabaseAdminRepository implements AdminRepository {
  async createAdmin(payload: CreateAdminPayload): Promise<void> {
    const { data, error } = await supabase.functions.invoke('create-admin-user', {
      body: payload,
    })

    if (error) throw new Error(await functionErrorMessage(error))
    if (data?.error) throw new Error(data.error)
  }

  async setupFirstAdmin(payload: SetupFirstAdminPayload): Promise<void> {
    const { data, error } = await supabase.functions.invoke('setup-first-admin', {
      body: payload,
    })

    if (error) throw new Error(await functionErrorMessage(error))
    if (data?.error) throw new Error(data.error)
  }
}
