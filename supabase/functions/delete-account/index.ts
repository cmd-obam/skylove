import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptionsRequest, jsonResponse, withCors } from '../_shared/cors.ts'

Deno.serve(
  withCors(async (req) => {
    if (req.method === 'OPTIONS') {
      return handleOptionsRequest()
    }

    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return jsonResponse({ error: 'unauthorized', message: '인증 정보가 없습니다.' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'server_config', message: '서버 설정 오류' }, 500)
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return jsonResponse({ error: 'unauthorized', message: '로그인 정보를 확인할 수 없습니다.' }, 401)
    }

    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) {
      return jsonResponse({ error: 'profile_check_failed', message: '회원 정보를 확인할 수 없습니다.' }, 500)
    }

    if (profile?.role === 'admin') {
      return jsonResponse(
        { error: 'forbidden', message: '관리자 계정은 직접 탈퇴할 수 없습니다.' },
        403,
      )
    }

    if (profile?.role === 'super_admin') {
      return jsonResponse(
        { error: 'forbidden', message: '최고관리자 계정은 직접 탈퇴할 수 없습니다.' },
        403,
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user.id)

    if (authDeleteError) {
      console.error('[delete-account] auth.admin.deleteUser failed', authDeleteError)

      return jsonResponse(
        { error: 'auth_delete_failed', message: authDeleteError.message },
        500,
      )
    }

    return jsonResponse({ success: true, userId: user.id })
  }),
)
