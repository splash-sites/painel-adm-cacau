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

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: callerProfile, error: callerProfileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfileError || callerProfile?.role !== 'super_admin') {
      return json({ error: 'Apenas super_admin pode cadastrar usuários' }, 403)
    }

    const { fullName, email, password, role, storeId } = await req.json()

    if (!fullName || !email || !password || !role) {
      return json({ error: 'Nome, e-mail, senha e papel são obrigatórios' }, 400)
    }
    if (role === 'store_admin' && !storeId) {
      return json({ error: 'Loja obrigatória pra colaborador' }, 400)
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError) return json({ error: createError.message }, 400)

    const { error: insertError } = await admin.from('profiles').upsert({
      id: created.user.id,
      full_name: fullName,
      email,
      role,
      store_id: role === 'store_admin' ? storeId : null,
      active: true,
    })

    if (insertError) {
      await admin.auth.admin.deleteUser(created.user.id)
      return json({ error: insertError.message }, 500)
    }

    return json({ success: true })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Erro desconhecido' }, 500)
  }
})
