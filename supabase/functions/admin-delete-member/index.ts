import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptionsRequest, jsonResponse, withCors } from '../_shared/cors.ts'

/**
 * 최고관리자 회원 탈퇴.
 * 1) 권한 검사
 * 2) auth.users 삭제 (service role)
 * 3) profiles 및 FK CASCADE 로 연관 데이터 정리
 *    - profiles.user_id ON DELETE CASCADE
 *    - board_comments / likes CASCADE
 *    - board_posts.author_id ON DELETE SET NULL
 *    - member_pii_access_logs.viewer_user_id CASCADE
 */
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
      console.error('[admin-delete-member] missing env', {
        hasUrl: Boolean(supabaseUrl),
        hasAnon: Boolean(supabaseAnonKey),
        hasService: Boolean(serviceRoleKey),
      })
      return jsonResponse(
        {
          error: 'server_config',
          message: '서버 설정 오류(SERVICE_ROLE)로 회원을 삭제할 수 없습니다.',
        },
        500,
      )
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
      .select('role, email, name')
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (targetProfileError) {
      return jsonResponse({ error: 'target_lookup_failed', message: '회원 정보를 확인할 수 없습니다.' }, 500)
    }

    if (targetProfile?.role === 'super_admin') {
      return jsonResponse({ error: 'forbidden', message: '최고관리자는 삭제할 수 없습니다.' }, 403)
    }

    // profile 이 없어도 auth.users 고아는 삭제 가능 (회원관리 정리용)
    const {
      data: { user: targetAuthUser },
      error: targetAuthLookupError,
    } = await adminClient.auth.admin.getUserById(targetUserId)

    if (targetAuthLookupError || !targetAuthUser) {
      if (!targetProfile) {
        return jsonResponse({ error: 'not_found', message: '회원을 찾을 수 없습니다.' }, 404)
      }
    }

    // 연관 데이터 선정리 (CASCADE 보강 — 실패해도 auth 삭제로 이어감)
    const cleanupSteps: Array<{ label: string; run: () => Promise<{ error: unknown }> }> = [
      {
        label: 'admin_content_notes',
        run: () =>
          adminClient.from('admin_content_notes').delete().eq('author_id', targetUserId),
      },
      {
        label: 'comment_likes',
        run: () => adminClient.from('comment_likes').delete().eq('user_id', targetUserId),
      },
      {
        label: 'post_likes',
        run: () => adminClient.from('post_likes').delete().eq('user_id', targetUserId),
      },
      {
        label: 'board_comments',
        run: () => adminClient.from('board_comments').delete().eq('user_id', targetUserId),
      },
      {
        label: 'member_pii_access_logs',
        run: () =>
          adminClient.from('member_pii_access_logs').delete().eq('viewer_user_id', targetUserId),
      },
    ]

    for (const step of cleanupSteps) {
      try {
        const { error: cleanupError } = await step.run()
        if (cleanupError) {
          console.warn(`[admin-delete-member] cleanup ${step.label}`, cleanupError)
        }
      } catch (cleanupException) {
        console.warn(`[admin-delete-member] cleanup ${step.label} exception`, cleanupException)
      }
    }

    // 게시글은 작성자만 비움 (콘텐츠 보존)
    try {
      const { error: postAuthorError } = await adminClient
        .from('board_posts')
        .update({ author_id: null })
        .eq('author_id', targetUserId)

      if (postAuthorError) {
        console.warn('[admin-delete-member] board_posts author nullify', postAuthorError)
      }
    } catch (postException) {
      console.warn('[admin-delete-member] board_posts author nullify exception', postException)
    }

    if (targetProfile) {
      const { error: profileDeleteError } = await adminClient
        .from('profiles')
        .delete()
        .eq('user_id', targetUserId)

      if (profileDeleteError) {
        console.warn('[admin-delete-member] profiles delete', profileDeleteError)
      }
    }

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(targetUserId)

    if (authDeleteError) {
      console.error('[admin-delete-member] auth.admin.deleteUser failed', authDeleteError)

      return jsonResponse(
        {
          error: 'auth_delete_failed',
          message: authDeleteError.message || '회원 삭제에 실패했습니다.',
        },
        500,
      )
    }

    console.log('[admin-delete-member] deleted', {
      targetUserId,
      email: targetProfile?.email ?? targetAuthUser?.email ?? null,
      name: targetProfile?.name ?? null,
    })

    return jsonResponse({
      success: true,
      userId: targetUserId,
      message: '회원 탈퇴 처리가 완료되었습니다.',
    })
  }),
)
