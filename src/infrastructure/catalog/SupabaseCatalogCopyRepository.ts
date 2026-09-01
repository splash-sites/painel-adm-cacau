import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../supabase/client'
import type {
  CatalogCopyRepository,
  CopyCatalogParams,
  CopyCatalogResult,
} from '../../application/catalog/CatalogCopyRepository'

/** supabase-js só põe "Edge Function returned a non-2xx status code" em error.message — o corpo real vem em error.context. */
async function functionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (body?.error) return body.error
    } catch {
      // corpo não era JSON
    }
  }
  return error instanceof Error ? error.message : 'Erro desconhecido'
}

export class SupabaseCatalogCopyRepository implements CatalogCopyRepository {
  async copy(params: CopyCatalogParams): Promise<CopyCatalogResult> {
    const { data, error } = await supabase.functions.invoke('copy-catalog', {
      body: {
        fromStoreId: params.fromStoreId,
        toStoreId: params.toStoreId,
        updateExisting: params.updateExisting,
        dryRun: params.dryRun,
        password: params.dryRun ? undefined : params.password,
      },
    })

    if (error) throw new Error(await functionErrorMessage(error))
    if (data?.error) throw new Error(data.error)

    return {
      dryRun: Boolean(data?.dryRun),
      created: data?.created ?? 0,
      updated: data?.updated ?? 0,
      skipped: data?.skipped ?? 0,
      imageCount: data?.imageCount ?? 0,
      imagesCopied: data?.imagesCopied ?? 0,
      imageErrors: data?.imageErrors ?? 0,
    }
  }
}
