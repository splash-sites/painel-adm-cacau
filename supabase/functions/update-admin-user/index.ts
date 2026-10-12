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
      return json({ error: 'Apenas super_admin pode editar usuários' }, 403)
    }

    const { userId, fullName, email, password } = await req.json()

    if (!userId || !fullName || !email) {
      return json({ error: 'Nome e e-mail são obrigatórios' }, 400)
    }

    const authUpdate: { email?: string; password?: string } = { email }
    if (password) authUpdate.password = password

    const { error: authError } = await admin.auth.admin.updateUserById(userId, authUpdate)
    if (authError) return json({ error: authError.message }, 400)

    const { error: profileError } = await admin
      .from('profiles')
      .update({ full_name: fullName, email })
      .eq('id', userId)

    if (profileError) return json({ error: profileError.message }, 500)

    return json({ success: true })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Erro desconhecido' }, 500)
  }
})
