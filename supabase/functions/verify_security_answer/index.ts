import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { compare } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'
import { handleOptionsRequest, jsonResponse, withCors } from '../_shared/cors.ts'
import { normalizeAnswer } from '../_shared/normalizeAnswer.ts'

Deno.serve(
  withCors(async (req) => {
    if (req.method === 'OPTIONS') {
      return handleOptionsRequest()
    }

    const body = await req.json()
    const name = String(body?.name ?? '').trim()
    const email = String(body?.email ?? '').trim()
    const rawAnswer = String(body?.answer ?? '')
    const normalized = normalizeAnswer(rawAnswer)
    const legacyTrimmed = rawAnswer.trim()

    if (!name || !email || !normalized) {
      return jsonResponse({ error: 'validation', message: '입력값을 확인해주세요.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'server_config', message: '서버 설정 오류' }, 500)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const answerCandidates = [normalized]
    if (legacyTrimmed && legacyTrimmed !== normalized) {
      answerCandidates.push(legacyTrimmed)
    }

    for (const candidate of answerCandidates) {
      const { data: verified, error: rpcError } = await adminClient.rpc(
        'verify_password_recovery_answer',
        {
          p_name: name,
          p_email: email,
          p_answer: candidate,
        },
      )

      if (!rpcError) {
        if (verified) {
          return jsonResponse({ success: true })
        }
        continue
      }

      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('name, email, security_answer_hash')
        .ilike('email', email)
        .maybeSingle()

      if (profileError || !profile?.security_answer_hash) {
        return jsonResponse({ success: false })
      }

      if (
        profile.email?.trim().toLowerCase() !== email.toLowerCase() ||
        profile.name?.trim().toLowerCase() !== name.toLowerCase()
      ) {
        return jsonResponse({ success: false })
      }

      const matched = await compare(candidate, profile.security_answer_hash)
      if (matched) {
        return jsonResponse({ success: true })
      }
    }

    return jsonResponse({ success: false })
  }),
)
