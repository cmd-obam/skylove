import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptionsRequest, jsonResponse, withCors } from '../_shared/cors.ts'

type AuthIdentity = {
  id?: string
  identity_id?: string
  provider?: string
  user_id?: string
}

function normalizeIdentities(raw: unknown): AuthIdentity[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .filter((item): item is AuthIdentity => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      ...item,
      identity_id: item.identity_id || item.id,
    }))
}

function hasGeneralLogin(user: {
  identities?: AuthIdentity[]
  user_metadata?: Record<string, unknown>
}): boolean {
  const identities = normalizeIdentities(user.identities)
  if (identities.some((item) => item.provider === 'email')) {
    return true
  }

  const metadata = user.user_metadata || {}
  if (metadata.general_login_registered === true) {
    return true
  }

  const username = metadata.username
  return typeof username === 'string' && username.trim().length > 0
}

async function ensureEmailIdentity(
  adminClient: ReturnType<typeof createClient>,
  user: {
    id: string
    email?: string | null
    identities?: AuthIdentity[]
  },
) {
  const identities = normalizeIdentities(user.identities)
  if (identities.some((item) => item.provider === 'email')) {
    return { ok: true as const }
  }

  const email = String(user.email || '').trim().toLowerCase()
  if (!email) {
    return {
      ok: false as const,
      message: '이메일 정보가 없어 일반 로그인 identity 를 만들 수 없습니다.',
    }
  }

  // Admin updateUserById 로 email 확인 상태를 맞추면,
  // 일부 GoTrue 버전에서 email identity 가 생성됩니다.
  const { data, error } = await adminClient.auth.admin.updateUserById(user.id, {
    email,
    email_confirm: true,
    app_metadata: {
      provider: 'email',
      providers: ['email', 'kakao'],
    },
  })

  if (error) {
    console.warn('[unlink-kakao] ensure email via updateUserById failed', error)
  }

  const refreshed = data?.user
    ? normalizeIdentities(data.user.identities)
    : normalizeIdentities((await adminClient.auth.admin.getUserById(user.id)).data?.user?.identities)

  if (refreshed.some((item) => item.provider === 'email')) {
    return { ok: true as const }
  }

  // GoTrue Admin REST: identity 직접 삭제는 가능하나 생성 API 가 없으므로
  // DB URL 이 있으면 auth.identities 에 email 행을 보강합니다.
  const dbUrl = Deno.env.get('SUPABASE_DB_URL') || Deno.env.get('DB_URL')
  if (!dbUrl) {
    return {
      ok: false as const,
      message:
        '일반 로그인 identity 를 자동 생성할 수 없습니다. Supabase Auth 버전/DB 설정을 확인해주세요.',
    }
  }

  const { default: postgres } = await import('https://deno.land/x/postgresjs@v3.4.5/mod.js')
  const sql = postgres(dbUrl, { prepare: false })

  try {
    await sql`
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      )
      SELECT
        gen_random_uuid(),
        ${user.id}::uuid,
        jsonb_build_object(
          'sub', ${user.id},
          'email', ${email},
          'email_verified', true,
          'phone_verified', false
        ),
        'email',
        ${user.id},
        now(),
        now(),
        now()
      WHERE NOT EXISTS (
        SELECT 1
        FROM auth.identities AS i
        WHERE i.user_id = ${user.id}::uuid
          AND i.provider = 'email'
      )
    `

    await sql`
      UPDATE auth.users
      SET
        raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
          || jsonb_build_object(
            'provider', 'email',
            'providers', (
              SELECT jsonb_agg(DISTINCT value)
              FROM jsonb_array_elements_text(
                coalesce(raw_app_meta_data->'providers', '[]'::jsonb) || '["email","kakao"]'::jsonb
              ) AS value
            )
          ),
        updated_at = now()
      WHERE id = ${user.id}::uuid
    `
  } finally {
    await sql.end({ timeout: 5 })
  }

  return { ok: true as const }
}

async function deleteKakaoIdentity(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  identityId: string,
) {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${userId}/identities/${identityId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    },
  )

  if (!response.ok) {
    const text = await response.text()
    let message = text
    try {
      const parsed = JSON.parse(text)
      message = parsed?.msg || parsed?.message || text
    } catch {
      // keep raw text
    }

    return { ok: false as const, message, status: response.status }
  }

  return { ok: true as const }
}

Deno.serve(
  withCors(async (req) => {
    if (req.method === 'OPTIONS') {
      return handleOptionsRequest()
    }

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed', message: 'POST 만 허용됩니다.' }, 405)
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

    if (!hasGeneralLogin(user)) {
      return jsonResponse(
        {
          error: 'needs_general_login',
          message: '일반 로그인 계정을 먼저 등록한 뒤 카카오 연동을 해제할 수 있습니다.',
        },
        400,
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: adminUserData, error: adminUserError } = await adminClient.auth.admin.getUserById(
      user.id,
    )

    if (adminUserError || !adminUserData?.user) {
      console.error('[unlink-kakao] getUserById failed', adminUserError)
      return jsonResponse(
        { error: 'user_lookup_failed', message: '회원 인증 정보를 확인할 수 없습니다.' },
        500,
      )
    }

    const adminUser = adminUserData.user
    const identities = normalizeIdentities(adminUser.identities)
    const kakaoIdentity = identities.find((item) => item.provider === 'kakao')

    if (!kakaoIdentity?.identity_id) {
      return jsonResponse(
        { error: 'kakao_not_found', message: '카카오 계정 연동 정보를 찾을 수 없습니다.' },
        404,
      )
    }

    const ensured = await ensureEmailIdentity(adminClient, adminUser)

    if (!ensured.ok) {
      return jsonResponse({ error: 'email_identity_required', message: ensured.message }, 500)
    }

    const deleted = await deleteKakaoIdentity(
      supabaseUrl,
      serviceRoleKey,
      user.id,
      kakaoIdentity.identity_id,
    )

    if (!deleted.ok) {
      console.error('[unlink-kakao] delete identity failed', deleted)
      return jsonResponse(
        {
          error: 'unlink_failed',
          message: deleted.message || '카카오 계정 연동 해제에 실패했습니다.',
        },
        deleted.status >= 400 && deleted.status < 600 ? deleted.status : 500,
      )
    }

    await adminClient.auth.admin.updateUserById(user.id, {
      app_metadata: {
        provider: 'email',
        providers: ['email'],
      },
    })

    return jsonResponse({
      success: true,
      message:
        '카카오 계정 연동이 해제되었습니다. 이후부터는 아이디 + 비밀번호 또는 이메일 + 비밀번호 로그인만 사용할 수 있습니다.',
      remainingMethods: ['이메일 로그인'],
    })
  }),
)
