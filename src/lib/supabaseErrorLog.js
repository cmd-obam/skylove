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

export function logSupabaseError(scope, error, context = {}) {
  const payload = {
    scope,
    context,
    response: serializeSupabaseError(error),
    raw: error,
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
