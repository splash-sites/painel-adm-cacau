// ============================================================================
// Edge Function: copy-catalog  (ver CLAUDE.md, "Feature: Copiar catálogo pra outra loja")
// Cópia de referência — o que roda de verdade está no Supabase (Edge Functions).
// Ao alterar lá, atualize este arquivo e commite junto.
//
// Fluxo:
//   1. valida JWT do caller -> profiles.role = 'super_admin' (403 senão)
//   2. execução real (dryRun=false): revalida a senha via signInWithPassword (401 "Senha incorreta")
//   3. chama a RPC copy_catalog via client SERVICE_ROLE, passando p_actor = user.id
//      (a RPC só aceita service_role — não é chamável direto por sessão autenticada)
//   4. execução real: copia os arquivos de foto pro caminho da loja destino, validando
//      o path contra "<from_store>/<arquivo>" (sem subpasta, sem "..")
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BUCKET = 'product-images'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Sem autenticação' }, 401)

  let body: {
    fromStoreId?: string
    toStoreId?: string
    updateExisting?: boolean
    dryRun?: boolean
    password?: string
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Corpo inválido' }, 400)
  }

  const { fromStoreId, toStoreId, updateExisting = false, dryRun = false, password } = body
  if (!fromStoreId || !toStoreId) return json({ error: 'Informe a loja de origem e destino' }, 400)
  if (fromStoreId === toStoreId) return json({ error: 'Origem e destino são a mesma loja' }, 400)
  if (!dryRun && !password) return json({ error: 'Confirme sua senha' }, 400)

  // 1. quem chamou -> super_admin (JWT do caller, sem privilégio)
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await caller.auth.getUser()
  const user = userData?.user
  if (userErr || !user) return json({ error: 'Sessão inválida' }, 401)
  if (!user.email) return json({ error: 'Conta sem e-mail — não dá pra confirmar a senha' }, 400)

  const { data: profile } = await caller
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'super_admin') {
    return json({ error: 'Apenas super_admin pode copiar catálogo' }, 403)
  }

  // 2. na execução real, revalida a senha (a RPC não é chamável direto — portão de verdade)
  if (!dryRun) {
    const pwCheck = createClient(SUPABASE_URL, ANON_KEY)
    const { error: pwErr } = await pwCheck.auth.signInWithPassword({
      email: user.email,
      password: password!,
    })
    if (pwErr) return json({ error: 'Senha incorreta' }, 401)
  }

  // 3. RPC via service_role; actor passado explícito
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data: result, error: rpcErr } = await admin.rpc('copy_catalog', {
    p_actor: user.id,
    p_from_store: fromStoreId,
    p_to_store: toStoreId,
    p_update_existing: updateExisting,
    p_dry_run: dryRun,
  })
  if (rpcErr) return json({ error: `Falha ao copiar: ${rpcErr.message}` }, 400)

  const payload = {
    dryRun,
    created: result?.created ?? 0,
    updated: result?.updated ?? 0,
    skipped: result?.skipped ?? 0,
    imageCount: result?.image_count ?? 0,
    imagesCopied: 0,
    imageErrors: 0,
  }
  if (dryRun) return json(payload)

  // 4. copia os arquivos de imagem pro caminho da loja destino
  const images: { product_id: string; source_url: string }[] = result?.images ?? []
  const marker = `/${BUCKET}/`
  const safePrefix = `${fromStoreId}/`

  for (const img of images) {
    const idx = img.source_url.indexOf(marker)
    if (idx === -1) {
      payload.imageErrors++
      continue
    }
    const fromPath = decodeURIComponent(img.source_url.slice(idx + marker.length))
    // exige "<loja-origem>/<arquivo>" — sem subpasta, sem ".." (achado #3)
    const rest = fromPath.startsWith(safePrefix) ? fromPath.slice(safePrefix.length) : null
    if (rest === null || rest.length === 0 || rest.includes('/') || rest.includes('..')) {
      payload.imageErrors++
      continue
    }
    const ext = rest.split('.').pop() || 'jpg'
    const toPath = `${toStoreId}/${crypto.randomUUID()}.${ext}`

    const { error: copyErr } = await admin.storage.from(BUCKET).copy(fromPath, toPath)
    if (copyErr) {
      payload.imageErrors++
      continue
    }
    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(toPath)
    const { error: updErr } = await admin
      .from('products')
      .update({ image_url: pub.publicUrl })
      .eq('id', img.product_id)
    if (updErr) {
      payload.imageErrors++
      continue
    }
    payload.imagesCopied++
  }

  return json(payload)
})
