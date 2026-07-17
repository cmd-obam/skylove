import { supabase } from '@/lib/supabase'
import { AUTH_MESSAGES } from '@/constants/authMessages'

const EDGE_FUNCTION_NAME = 'find_by_name_email'

function isEdgeFunctionUnavailable(error, data) {
  if (data?.code === 'NOT_FOUND' && data?.message === 'Requested function was not found') {
    return true
  }

  const message = String(error?.message ?? '').toLowerCase()
  const contextStatus = error?.context?.status ?? error?.status
  const name = String(error?.name ?? '').toLowerCase()

  return (
    name.includes('functionsfetcherror') ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('cors') ||
    message.includes('requested function was not found') ||
    (contextStatus === 404 &&
      (message.includes('edge function') || message.includes('not found')))
  )
}

async function parseEdgeFunctionResult(data, error) {
  if (!error) {
    return { data, error: null }
  }

  if (error?.context && typeof error.context.json === 'function') {
    try {
      const body = await error.context.json()

      if (body && typeof body === 'object') {
        return { data: body, error: null }
      }
    } catch {
      // ignore parse failure
    }
  }

  return { data, error }
}

async function lookupMemberViaEdgeFunction({ name, email }) {
  const { data: rawData, error: rawError } = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { name, email },
  })

  const { data, error } = await parseEdgeFunctionResult(rawData, rawError)

  if (error) {
    if (isEdgeFunctionUnavailable(error, data)) {
      return { unavailable: true }
    }

    console.error(`[AccountRecovery] ${EDGE_FUNCTION_NAME} failed`, error)
    return { success: false, message: '회원 조회 중 오류가 발생했습니다.' }
  }

  if (data?.success && data?.username && data?.email) {
    return {
      success: true,
      username: data.username,
      email: data.email,
      name: data.name ?? name,
    }
  }

  if (data?.error === 'not_found') {
    return { success: false, message: AUTH_MESSAGES.memberNotFound }
  }

  if (data?.error) {
    return {
      success: false,
      message: data.message || '회원 조회 중 오류가 발생했습니다.',
    }
  }

  return { unavailable: true }
}

async function lookupMemberViaRpc({ name, email }) {
  const { data, error } = await supabase.rpc('lookup_member_by_name_email', {
    p_name: name,
    p_email: email,
  })

  if (!error && data?.username && data?.email) {
    return {
      success: true,
      username: data.username,
      email: data.email,
      name: data.name ?? name,
    }
  }

  if (error?.code === 'PGRST202') {
    console.warn('[AccountRecovery] lookup_member_by_name_email RPC missing, trying legacy RPCs')
    return lookupMemberViaLegacyRpc({ name, email })
  }

  if (error) {
    console.error('[AccountRecovery] lookup_member_by_name_email RPC failed', error)
    return lookupMemberViaTable({ name, email })
  }

  if (!data) {
    return { success: false, message: AUTH_MESSAGES.memberNotFound }
  }

  return { success: false, message: AUTH_MESSAGES.memberNotFound }
}

async function lookupMemberViaTable({ name, email }) {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, email, name')
    .ilike('email', email)
    .maybeSingle()

  if (error) {
    console.error('[AccountRecovery] profiles table lookup failed', error)
    return { success: false, message: '회원 조회 중 오류가 발생했습니다.' }
  }

  if (!data?.username || data.name?.trim().toLowerCase() !== name.toLowerCase()) {
    return { success: false, message: AUTH_MESSAGES.memberNotFound }
  }

  return {
    success: true,
    username: data.username,
    email: data.email,
    name: data.name,
  }
}

async function lookupMemberViaLegacyRpc({ name, email }) {
  const { data: username, error: usernameError } = await supabase.rpc('find_username_by_name_email', {
    p_name: name,
    p_email: email,
  })

  if (usernameError) {
    console.error('[AccountRecovery] find_username_by_name_email RPC failed', usernameError)

    if (usernameError.code === 'PGRST202') {
      console.warn('[AccountRecovery] legacy RPC missing, falling back to profiles table')
      return lookupMemberViaTable({ name, email })
    }

    return { success: false, message: '회원 조회 중 오류가 발생했습니다.' }
  }

  if (!username) {
    return { success: false, message: AUTH_MESSAGES.memberNotFound }
  }

  const { data: resolvedEmail, error: emailError } = await supabase.rpc('resolve_email_by_name_email', {
    p_name: name,
    p_email: email,
  })

  if (emailError) {
    console.error('[AccountRecovery] resolve_email_by_name_email RPC failed', emailError)

    if (emailError.code === 'PGRST202') {
      console.warn('[AccountRecovery] resolve_email RPC missing, falling back to profiles table')
      return lookupMemberViaTable({ name, email })
    }

    return { success: false, message: '회원 조회 중 오류가 발생했습니다.' }
  }

  if (!resolvedEmail) {
    return { success: false, message: AUTH_MESSAGES.memberNotFound }
  }

  return {
    success: true,
    username,
    email: resolvedEmail,
    name,
  }
}

async function lookupMemberByNameEmail({ name, email }) {
  const trimmedName = String(name ?? '').trim()
  const trimmedEmail = String(email ?? '').trim()

  const edgeResult = await lookupMemberViaEdgeFunction({
    name: trimmedName,
    email: trimmedEmail,
  })

  if (edgeResult.unavailable) {
    console.warn(`[AccountRecovery] ${EDGE_FUNCTION_NAME} unavailable, falling back to RPC`)
    return lookupMemberViaRpc({ name: trimmedName, email: trimmedEmail })
  }

  return edgeResult
}

export async function findUsernameByNameEmail({ name, email }) {
  const trimmedName = String(name ?? '').trim()
  const trimmedEmail = String(email ?? '').trim()

  if (!trimmedName) {
    return { success: false, message: '이름을 입력해주세요.' }
  }

  if (!trimmedEmail) {
    return { success: false, message: '이메일을 입력해주세요.' }
  }

  const result = await lookupMemberByNameEmail({ name: trimmedName, email: trimmedEmail })

  if (!result.success) {
    return result
  }

  return {
    success: true,
    username: result.username,
    message: `회원님의 아이디는\n\n${result.username}\n\n입니다.`,
  }
}

export async function verifyMemberForPasswordReset({ name, email }) {
  const trimmedName = String(name ?? '').trim()
  const trimmedEmail = String(email ?? '').trim()

  if (!trimmedName) {
    return { success: false, message: '이름을 입력해주세요.' }
  }

  if (!trimmedEmail) {
    return { success: false, message: '이메일을 입력해주세요.' }
  }

  const result = await lookupMemberByNameEmail({ name: trimmedName, email: trimmedEmail })

  if (!result.success) {
    return result
  }

  return {
    success: true,
    email: result.email,
    name: result.name ?? trimmedName,
    username: result.username,
  }
}

/**
 * 비밀번호 찾기: 아이디(username)로 회원 확인 후 name/email 반환.
 * 기존 login 조회와 동일하게 profiles.username SELECT 를 사용합니다.
 */
export async function verifyMemberForPasswordResetByLoginId(loginId) {
  const trimmedLoginId = String(loginId ?? '').trim()

  if (!trimmedLoginId) {
    return { success: false, message: '아이디를 입력해주세요.' }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('username, email, name, security_question')
    .eq('username', trimmedLoginId)
    .maybeSingle()

  if (error) {
    console.error('[AccountRecovery] username lookup for password reset failed', error)
    return { success: false, message: '회원 조회 중 오류가 발생했습니다.' }
  }

  if (!data?.username || !data?.email || !data?.name) {
    return { success: false, message: '존재하지 않는 아이디입니다.' }
  }

  if (!data.security_question) {
    return {
      success: false,
      message: '등록된 보안 질문이 없습니다.\n관리자에게 문의해주세요.',
    }
  }

  return {
    success: true,
    username: data.username,
    email: data.email,
    name: data.name,
  }
}
