import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptionsRequest, jsonResponse, withCors } from '../_shared/cors.ts'

Deno.serve(
  withCors(async (req) => {
    if (req.method === 'OPTIONS') {
      return handleOptionsRequest()
    }

    const body = await req.json()
    const name = String(body?.name ?? '').trim()
    const email = String(body?.email ?? '').trim()

    if (!name) {
      return jsonResponse({ error: 'validation', message: '이름을 입력해주세요.' }, 400)
    }

    if (!email) {
      return jsonResponse({ error: 'validation', message: '이메일을 입력해주세요.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'server_config', message: '서버 설정 오류' }, 500)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('username, email, name')
      .ilike('email', email)
      .maybeSingle()

    if (profileError) {
      console.error('[find_by_name_email] profile lookup failed', profileError)
      return jsonResponse({ error: 'lookup_failed', message: '회원 조회 중 오류가 발생했습니다.' }, 500)
    }

    if (
      !profile?.username ||
      profile.email?.trim().toLowerCase() !== email.toLowerCase() ||
      profile.name?.trim().toLowerCase() !== name.toLowerCase()
    ) {
      return jsonResponse({ error: 'not_found', message: '❌ 회원정보가 일치하지 않습니다.' }, 200)
    }

    return jsonResponse({
      success: true,
      username: profile.username,
      email: profile.email,
      name: profile.name,
    })
  }),
)
