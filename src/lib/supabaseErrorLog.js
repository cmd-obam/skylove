/**
 * Supabase PostgREST / AuthError 객체를 Network Response 형태로 직렬화
 */
export function serializeSupabaseError(error) {
  if (!error) {
    return null
  }

  return {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
    status: error.status ?? null,
    name: error.name ?? null,
  }
}

export function isMissingProfileError(error) {
  const code = error?.code ?? ''
  const message = String(error?.message ?? '').toLowerCase()
  return code === 'PGRST116' || message.includes('0 rows') || message.includes('multiple (or no) rows')
}

export function logSupabaseError(scope, error, context = {}) {
  const payload = {
    scope,
    context,
    response: serializeSupabaseError(error),
    raw: error,
  }

  // 회원가입 직후 등 profile 행이 아직 없는 PGRST116 은 정상 흐름입니다.
  if (isMissingProfileError(error)) {
    console.info(`[${scope}] profile not found yet (PGRST116)`, {
      context,
      response: payload.response,
    })
    return payload
  }

  console.error(`[${scope}] Supabase error`, payload)
  console.error(`[${scope}] Supabase response JSON`, JSON.stringify(payload.response, null, 2))

  return payload
}

/**
 * fetchProfileByUserId 가 호출하는 REST 경로 (디버깅용)
 */
export function describeProfileFetchRequest(supabaseUrl, userId, select) {
  const base = (supabaseUrl ?? '').replace(/\/$/, '')
  const query = new URLSearchParams({
    select,
    user_id: `eq.${userId}`,
  })

  return {
    method: 'GET',
    path: `/rest/v1/profiles?${query.toString()}`,
    url: `${base}/rest/v1/profiles?${query.toString()}`,
    select,
    userId,
  }
}
