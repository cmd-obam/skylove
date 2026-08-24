import { supabase } from '@/lib/supabase'
import { isEmailConfirmed } from '@/services/auth/authCallbackSession'
import { USERNAME_NOT_FOUND_MESSAGE } from '@/services/auth/loginErrors'
import { handleLogin } from '@/services/auth/login'
import { getEmailConfirmRedirectTo, validateSignupEmail } from '@/services/auth/signup'
import { getAccountLoginMethods } from '@/services/auth/unlinkKakao'
import { peekEmailVerifiedBeacon } from '@/utils/signupDraft'

const CONVERSION_INVALID_CREDENTIALS_MESSAGE = '아이디 또는 비밀번호가 올바르지 않습니다.'

function mapEmailUpdateError(error) {
  const message = String(error?.message ?? '').toLowerCase()

  if (
    message.includes('already registered') ||
    message.includes('already been registered') ||
    message.includes('email address has already been registered') ||
    message.includes('user already registered')
  ) {
    return '이미 다른 계정에서 사용 중인 이메일입니다.'
  }

  return error?.message || '이메일 인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.'
}

/**
 * 카카오 회원이 이메일 로그인으로 전환할 때 사용할 이메일 중복 확인.
 * 본인 profiles.email 은 허용합니다.
 */
export async function checkEmailAvailableForConversion(email, currentUserId) {
  const validation = validateSignupEmail(email)

  if (!validation.valid) {
    return {
      available: false,
      message: validation.errors.email || '이메일 형식을 확인해주세요.',
    }
  }

  const trimmedEmail = String(email || '').trim().toLowerCase()

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, email')
    .ilike('email', trimmedEmail)
    .maybeSingle()

  if (error) {
    console.error('[ConvertToEmailLogin] profiles email lookup failed', error)
    return {
      available: false,
      message: '이메일 확인에 실패했습니다. 잠시 후 다시 시도해주세요.',
    }
  }

  if (!data || data.user_id === currentUserId) {
    return {
      available: true,
      message: '사용 가능한 이메일입니다.',
    }
  }

  return {
    available: false,
    message: '이미 다른 계정에서 사용 중인 이메일입니다.',
  }
}

/**
 * 1차 본인 확인 — 기존 handleLogin(아이디→profiles.email→signInWithPassword) 재사용.
 * 현재 세션 user_id 와 profiles.username 일치 여부를 추가로 검증합니다.
 */
export async function verifyCredentialsForConversion({
  loginId,
  password,
  currentUserId,
  currentUsername,
}) {
  const trimmedLoginId = String(loginId ?? '').trim()
  const trimmedUsername = String(currentUsername ?? '').trim()

  if (!trimmedLoginId || !password) {
    return {
      success: false,
      message: CONVERSION_INVALID_CREDENTIALS_MESSAGE,
    }
  }

  if (trimmedLoginId !== trimmedUsername) {
    return {
      success: false,
      message: CONVERSION_INVALID_CREDENTIALS_MESSAGE,
    }
  }

  const loginResult = await handleLogin({ loginId: trimmedLoginId, password })

  if (!loginResult.success) {
    if (loginResult.reason === 'username_not_found') {
      return {
        success: false,
        message: CONVERSION_INVALID_CREDENTIALS_MESSAGE,
        code: 'invalid_credentials',
      }
    }

    if (
      loginResult.reason === 'invalid_credentials' ||
      loginResult.message === USERNAME_NOT_FOUND_MESSAGE
    ) {
      return {
        success: false,
        message: CONVERSION_INVALID_CREDENTIALS_MESSAGE,
        code: 'invalid_credentials',
      }
    }

    return {
      success: false,
      message: loginResult.message || CONVERSION_INVALID_CREDENTIALS_MESSAGE,
      code: loginResult.reason || 'auth_error',
    }
  }

  if (loginResult.profile?.effectiveUserId && loginResult.profile.effectiveUserId !== currentUserId) {
    return {
      success: false,
      message: CONVERSION_INVALID_CREDENTIALS_MESSAGE,
      code: 'invalid_credentials',
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== currentUserId) {
    return {
      success: false,
      message: CONVERSION_INVALID_CREDENTIALS_MESSAGE,
      code: 'invalid_credentials',
    }
  }

  return { success: true }
}

export async function getConversionEmailVerificationState(expectedEmail) {
  const trimmedEmail = String(expectedEmail || '').trim().toLowerCase()

  if (!trimmedEmail) {
    return { verified: false, reason: 'missing_email' }
  }

  if (peekEmailVerifiedBeacon(trimmedEmail)) {
    return { verified: true, source: 'beacon' }
  }

  try {
    await supabase.auth.refreshSession()
  } catch (error) {
    console.warn('[ConvertToEmailLogin] refreshSession during email check failed', error)
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { verified: false, reason: 'auth_error' }
  }

  const sessionEmail = String(user.email || '').trim().toLowerCase()

  if (sessionEmail === trimmedEmail && isEmailConfirmed(user)) {
    return { verified: true, source: 'session' }
  }

  return { verified: false, reason: 'pending' }
}

/**
 * 전환용 이메일 인증 메일 발송.
 * 기존 auth user 의 email 을 updateUser 로 변경/확인합니다 (새 auth user 생성 없음).
 */
export async function sendConversionEmailVerification(targetEmail) {
  const trimmedEmail = String(targetEmail || '').trim().toLowerCase()
  const validation = validateSignupEmail(trimmedEmail)

  if (!validation.valid) {
    return {
      success: false,
      message: validation.errors.email || '이메일 형식을 확인해주세요.',
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: '로그인 세션을 확인할 수 없습니다. 다시 로그인한 뒤 시도해주세요.',
    }
  }

  const availability = await checkEmailAvailableForConversion(trimmedEmail, user.id)

  if (!availability.available) {
    return {
      success: false,
      message: availability.message,
    }
  }

  const currentEmail = String(user.email || '').trim().toLowerCase()

  if (currentEmail === trimmedEmail && isEmailConfirmed(user)) {
    return {
      success: true,
      alreadyVerified: true,
      message: '이메일 인증이 이미 완료되어 있습니다.',
    }
  }

  const { error } = await supabase.auth.updateUser(
    { email: trimmedEmail },
    { emailRedirectTo: getEmailConfirmRedirectTo() },
  )

  if (error) {
    console.error('[ConvertToEmailLogin] updateUser(email) failed', {
      code: error.code,
      message: error.message,
    })

    return {
      success: false,
      message: mapEmailUpdateError(error),
      error,
    }
  }

  return {
    success: true,
    alreadyVerified: false,
    message:
      '입력하신 이메일 주소로 인증 메일을 보냈습니다.\n메일의 인증 링크를 눌러 인증을 완료해주세요.',
  }
}

/**
 * 이메일 인증 완료 후 카카오 identity 제거 + email identity 보장.
 * 실패 시 카카오 연동은 서버에서 유지됩니다.
 */
export async function completeKakaoToEmailConversion(expectedEmail) {
  const trimmedEmail = String(expectedEmail || '').trim().toLowerCase()

  const methods = await getAccountLoginMethods()

  if (!methods.success) {
    return { success: false, message: methods.message }
  }

  if (!methods.hasKakao) {
    return {
      success: false,
      message: '카카오 로그인 연동 정보를 찾을 수 없습니다.',
    }
  }

  const verification = await getConversionEmailVerificationState(
    trimmedEmail || methods.user?.email,
  )

  if (!verification.verified) {
    return {
      success: false,
      message: '이메일 인증이 완료되지 않았습니다. 인증 메일을 확인한 뒤 다시 시도해주세요.',
      code: 'email_not_verified',
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const sessionEmail = String(user?.email || '').trim().toLowerCase()

  if (trimmedEmail && sessionEmail !== trimmedEmail) {
    return {
      success: false,
      message: '인증된 이메일과 입력한 이메일이 일치하지 않습니다. 다시 시도해주세요.',
      code: 'email_mismatch',
    }
  }

  const { data, error } = await supabase.functions.invoke('convert-kakao-to-email-login', {
    method: 'POST',
    body: {},
  })

  if (error) {
    console.error('[ConvertToEmailLogin] edge function invoke failed', error)
    return {
      success: false,
      message:
        error.message ||
        '이메일 로그인 전환에 실패했습니다. 카카오 로그인은 유지됩니다. 잠시 후 다시 시도해주세요.',
      error,
    }
  }

  if (data?.error || data?.success === false) {
    return {
      success: false,
      message:
        data?.message ||
        '이메일 로그인 전환에 실패했습니다. 카카오 로그인은 유지됩니다.',
      code: data?.error,
    }
  }

  const after = await getAccountLoginMethods()

  if (after.success && after.hasKakao) {
    return {
      success: false,
      message:
        '전환 요청은 처리되었지만 카카오 연결이 남아 있습니다. 잠시 후 다시 확인해주세요.',
    }
  }

  return {
    success: true,
    message:
      data?.message ||
      '이메일 로그인으로 전환이 완료되었습니다.\n이후부터는 아이디 + 비밀번호로 로그인할 수 있습니다.',
    methods: after.success ? after : null,
  }
}

export function getSimplifiedLoginMethodLabel({ hasKakao }) {
  return hasKakao ? '카카오 로그인' : '이메일 로그인'
}
