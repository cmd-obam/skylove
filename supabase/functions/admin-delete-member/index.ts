import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptionsRequest, jsonResponse, withCors } from '../_shared/cors.ts'

Deno.serve(
  withCors(async (req) => {
    if (req.method === 'OPTIONS') {
      return handleOptionsRequest()
    }

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed', message: 'POST만 허용됩니다.' }, 405)
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

    let targetUserId = ''

    try {
      const body = await req.json()
      targetUserId = String(body?.targetUserId ?? '').trim()
    } catch {
      return jsonResponse({ error: 'invalid_body', message: '요청 형식이 올바르지 않습니다.' }, 400)
    }

    if (!targetUserId) {
      return jsonResponse({ error: 'validation', message: '삭제할 회원 ID가 필요합니다.' }, 400)
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser()

    if (callerError || !caller) {
      return jsonResponse({ error: 'unauthorized', message: '로그인 정보를 확인할 수 없습니다.' }, 401)
    }

    const { data: callerProfile, error: callerProfileError } = await userClient
      .from('profiles')
      .select('role')
      .eq('user_id', caller.id)
      .maybeSingle()

    if (callerProfileError) {
      return jsonResponse({ error: 'profile_check_failed', message: '회원 정보를 확인할 수 없습니다.' }, 500)
    }

    if (callerProfile?.role !== 'super_admin') {
      return jsonResponse({ error: 'forbidden', message: '접근 권한이 없습니다.' }, 403)
    }

    if (caller.id === targetUserId) {
      return jsonResponse(
        { error: 'forbidden', message: '최고관리자 계정은 직접 탈퇴할 수 없습니다.' },
        403,
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (targetProfileError) {
      return jsonResponse({ error: 'target_lookup_failed', message: '회원 정보를 확인할 수 없습니다.' }, 500)
    }

    if (!targetProfile) {
      return jsonResponse({ error: 'not_found', message: '회원을 찾을 수 없습니다.' }, 404)
    }

    if (targetProfile.role === 'super_admin') {
      return jsonResponse({ error: 'forbidden', message: '최고관리자는 삭제할 수 없습니다.' }, 403)
    }

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(targetUserId)

    if (authDeleteError) {
      console.error('[admin-delete-member] auth.admin.deleteUser failed', authDeleteError)

      return jsonResponse(
        { error: 'auth_delete_failed', message: authDeleteError.message || '회원 삭제에 실패했습니다.' },
        500,
      )
    }

    return jsonResponse({ success: true, userId: targetUserId })
  }),
)
