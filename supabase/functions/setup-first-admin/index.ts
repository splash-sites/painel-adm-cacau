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
    const { fullName, email, password } = await req.json()

    if (!fullName || !email || !password) {
      return json({ error: 'Nome, e-mail e senha são obrigatórios' }, 400)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Guard: só permite rodar enquanto não existir nenhum super_admin.
    const { count, error: countError } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'super_admin')

    if (countError) return json({ error: countError.message }, 500)
    if (count && count > 0) {
      return json({ error: 'Já existe um super_admin configurado. Peça pra um admin te cadastrar em "Usuários".' }, 403)
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError) return json({ error: createError.message }, 400)

    const { error: profileError } = await admin.from('profiles').insert({
      id: created.user.id,
      full_name: fullName,
      email,
      role: 'super_admin',
      store_id: null,
      active: true,
    })


    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id)
      return json({ error: profileError.message }, 500)
    }

    return json({ success: true })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Erro desconhecido' }, 500)
  }
})
