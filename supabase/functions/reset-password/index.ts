import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || !password) {
    return '비밀번호를 입력해주세요.'
  }

  if (password.length < 8) {
    return '비밀번호는 8자 이상 입력해주세요.'
  }

  if (!/[a-zA-Z]/.test(password)) {
    return '비밀번호에 영문을 포함해주세요.'
  }

  if (!/\d/.test(password)) {
    return '비밀번호에 숫자를 포함해주세요.'
  }

  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const name = String(body?.name ?? '').trim()
    const email = String(body?.email ?? '').trim()
    const password = body?.password
    const securityAnswer = String(body?.securityAnswer ?? '').trim()

    if (!name) {
      return new Response(JSON.stringify({ error: 'validation', message: '이름을 입력해주세요.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!email) {
      return new Response(JSON.stringify({ error: 'validation', message: '이메일을 입력해주세요.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const passwordError = validatePassword(password)

    if (passwordError) {
      return new Response(JSON.stringify({ error: 'validation', message: passwordError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!securityAnswer) {
      return new Response(
        JSON.stringify({ error: 'validation', message: '비밀번호 찾기 답변을 입력해주세요.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'server_config', message: '서버 설정 오류' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('user_id, email, name, security_answer_hash')
      .ilike('email', email)
      .maybeSingle()

    if (profileError) {
      console.error('[reset-password] profile lookup failed', profileError)

      return new Response(
        JSON.stringify({ error: 'lookup_failed', message: '비밀번호 변경 중 오류가 발생했습니다.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (
      !profile?.user_id ||
      profile.email?.trim().toLowerCase() !== email.toLowerCase() ||
      profile.name?.trim().toLowerCase() !== name.toLowerCase()
    ) {
      return new Response(
        JSON.stringify({ error: 'not_found', message: '❌ 회원정보가 일치하지 않습니다.' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!profile.security_answer_hash) {
      return new Response(
        JSON.stringify({
          error: 'security_missing',
          message: '등록된 비밀번호 찾기 질문이 없습니다. 관리자에게 문의해주세요.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const { data: answerVerified, error: verifyError } = await adminClient.rpc(
      'verify_password_recovery_answer',
      {
        p_name: name,
        p_email: email,
        p_answer: securityAnswer,
      },
    )

    if (verifyError) {
      console.error('[reset-password] security answer verify failed', verifyError)

      return new Response(
        JSON.stringify({
          error: 'verify_failed',
          message: '답변 확인 중 오류가 발생했습니다.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!answerVerified) {
      return new Response(
        JSON.stringify({
          error: 'security_mismatch',
          message: '등록하신 질문과 답변이 일치하지 않습니다. 다시 확인해주세요.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(profile.user_id, {
      password: String(password),
    })

    if (updateError) {
      console.error('[reset-password] auth update failed', {
        userId: profile.user_id,
        code: updateError.code,
        message: updateError.message,
      })

      return new Response(
        JSON.stringify({
          error: 'update_failed',
          message: updateError.message || '비밀번호 변경에 실패했습니다.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[reset-password] unexpected error', error)

    return new Response(
      JSON.stringify({
        error: 'unknown',
        message: error instanceof Error ? error.message : '알 수 없는 오류',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
