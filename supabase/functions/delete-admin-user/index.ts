import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado' }, 401)

    const caller = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const {
      data: { user },
      error: userError,
    } = await caller.auth.getUser()
    if (userError || !user) return json({ error: 'Não autenticado' }, 401)

    const { userId } = await req.json()
    if (!userId) return json({ error: 'userId obrigatório' }, 400)

    if (userId === user.id) {
      return json({ error: 'Não é possível excluir a própria conta' }, 400)
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: callerProfile, error: callerProfileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfileError || callerProfile?.role !== 'super_admin') {
      return json({ error: 'Apenas super_admin pode excluir usuários' }, 403)
    }

    const { data: targetProfile, error: targetProfileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (targetProfileError) return json({ error: targetProfileError.message }, 500)
    if (targetProfile?.role === 'super_admin') {
      return json({ error: 'Não é possível excluir outro administrador' }, 403)
    }

    // Apaga o profile explicitamente antes (não depende de cascade existir).
    const { error: profileDeleteError } = await admin.from('profiles').delete().eq('id', userId)
    if (profileDeleteError) {
      if (profileDeleteError.code === '23503') {
        return json({ error: 'Usuário já tem pedido vinculado — desative em vez de excluir' }, 400)
      }
      return json({ error: profileDeleteError.message }, 500)
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
    if (deleteError) {
      return json({ error: deleteError.message || 'Falha ao excluir usuário' }, 500)
    }

    return json({ success: true })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Erro desconhecido' }, 500)
  }
})
