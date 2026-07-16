import { supabase } from '@/lib/supabase'
import { peekEmailVerifiedBeacon } from '@/utils/signupDraft'
import { syncSupabaseAuthSession } from '@/services/auth/authCallbackSession'
import { clearAuthSession } from '@/utils/auth'
import {
  classifyProfileSaveError,
  formatSupabaseError,
  mapEmailVerificationError,
  mapSupabaseAuthError,
  mapSupabaseProfileError,
  SIGNUP_COMPLETE_MESSAGE,
  SIGNUP_EMAIL_ALREADY_VERIFIED_MESSAGE,
  SIGNUP_EMAIL_NOT_VERIFIED_MESSAGE,
  SIGNUP_EMAIL_SENT_MESSAGE,
} from '@/services/auth/signupErrors'
import { DEFAULT_MEMBER_ROLE } from '@/services/auth/profileSchema'
import { validateResetPassword } from '@/services/auth/passwordValidation'
import {
  resolveSecurityQuestionForStorage,
  SECURITY_CUSTOM_QUESTION_ID,
} from '@/data/securityQuestions'
import {
  CONGREGANT_TYPE_IDS,
  isOtherCongregantType,
} from '@/data/congregantTypes'
import { withAllowedOtpSend } from '@/services/auth/otpSendGuard'

const LOGIN_ID_PATTERN = /^[a-zA-Z0-9_]{4,20}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^01[0-9]-\d{3,4}-\d{4}$/
const BIRTH_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export { BIRTH_DATE_PATTERN }

export const BIRTH_DATE_MIN = '1900-01-01'

export function getBirthDateMax() {
  return new Date().toISOString().slice(0, 10)
}

export function normalizeBirthDate(value) {
  if (!value) {
    return ''
  }

  const trimmed = value.trim()
  const match = trimmed.match(/^(\d+)-(\d{1,2})-(\d{1,2})$/)

  if (!match) {
    return trimmed
  }

  const year = match[1].slice(0, 4)
  const month = match[2].padStart(2, '0').slice(0, 2)
  const day = match[3].padStart(2, '0').slice(0, 2)

  return `${year}-${month}-${day}`
}

export function resolveBirthDateForDatabase(value) {
  const normalized = normalizeBirthDate(value)

  if (!normalized || !BIRTH_DATE_PATTERN.test(normalized)) {
    return null
  }

  return normalized
}

export const PASSWORD_REQUIREMENT_HINT = '8자 이상, 영문·숫자 포함'
export const PASSWORD_PLACEHOLDER = '8자 이상, 영문·숫자 포함하여 입력하세요.'
export const PASSWORD_RULE_LIVE_MESSAGE = '비밀번호 형식이 올바르지 않습니다. (8자 이상, 영문·숫자 포함)'

export function isPasswordRuleValid(password) {
  if (!password) {
    return false
  }

  return validatePassword(password) === null
}

export function getPasswordRuleLiveError(password) {
  if (!password) {
    return undefined
  }

  return validateResetPassword(password) ?? undefined
}

export function validatePassword(password) {
  return validateResetPassword(password)
}

export const INITIAL_SIGNUP_FORM = {
  loginId: '',
  password: '',
  passwordConfirm: '',
  securityQuestion: '',
  securityCustomQuestion: '',
  securityAnswer: '',
  congregantType: '',
  attendingChurch: '',
  name: '',
  birthDate: '',
  email: '',
  phone: '',
  agreePrivacy: false,
  agreeTerms: false,
  agreeEmail: false,
}

export function validateForm(form, { isIdChecked = false, isEmailVerified = false } = {}) {
  const errors = {}

  if (!form.loginId.trim()) {
    errors.loginId = '아이디를 입력해주세요.'
  } else if (!LOGIN_ID_PATTERN.test(form.loginId.trim())) {
    errors.loginId = '아이디는 4~20자의 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.'
  } else if (!isIdChecked) {
    errors.loginId = '아이디 중복확인을 해주세요.'
  }

  const passwordError = validatePassword(form.password)
  if (!form.password) {
    errors.password = '비밀번호를 입력해주세요.'
  } else if (passwordError) {
    errors.password = passwordError
  }

  if (!form.passwordConfirm) {
    errors.passwordConfirm = '비밀번호 확인을 입력해주세요.'
  } else if (!passwordError && form.password !== form.passwordConfirm) {
    errors.passwordConfirm = '비밀번호가 일치하지 않습니다.'
  }

  if (!form.securityQuestion) {
    errors.securityQuestion = '비밀번호 분실 시 질문을 선택해주세요.'
  } else if (
    form.securityQuestion === SECURITY_CUSTOM_QUESTION_ID &&
    !form.securityCustomQuestion.trim()
  ) {
    errors.securityCustomQuestion = '직접 입력 질문을 입력해주세요.'
  }

  if (!form.securityAnswer.trim()) {
    errors.securityAnswer = form.securityAnswer
      ? '비밀번호 분실 시 답변에 공백만 입력할 수 없습니다.'
      : '비밀번호 분실 시 답변을 입력해주세요.'
  }

  if (!form.congregantType || !CONGREGANT_TYPE_IDS.has(form.congregantType)) {
    errors.congregantType = '교인 구분을 선택해주세요.'
  } else if (isOtherCongregantType(form.congregantType) && !form.attendingChurch.trim()) {
    errors.congregantType = form.attendingChurch
      ? '출석 교회에 공백만 입력할 수 없습니다.'
      : '타 교회 교인인 경우 출석 교회를 입력해주세요.'
  }

  const trimmedName = form.name.trim()

  if (!trimmedName) {
    errors.name = form.name ? '이름에 공백만 입력할 수 없습니다.' : '이름을 입력해주세요.'
  }

  if (!form.birthDate) {
    errors.birthDate = '생년월일을 선택해주세요.'
  } else if (!BIRTH_DATE_PATTERN.test(form.birthDate)) {
    errors.birthDate = '올바른 생년월일 형식을 입력해주세요.'
  }

  if (!form.email.trim()) {
    errors.email = '이메일을 입력해주세요.'
  } else if (!EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = '올바른 이메일 형식을 입력해주세요.'
  } else if (!isEmailVerified) {
    errors.email = '이메일 인증을 완료해주세요.'
  }

  if (form.phone.trim() && !PHONE_PATTERN.test(form.phone.trim())) {
    errors.phone = '휴대폰 번호 형식을 확인해주세요. (예: 010-0000-0000)'
  }

  if (!form.agreePrivacy) {
    errors.agreePrivacy = '개인정보 처리방침에 동의해주세요.'
  }

  if (!form.agreeTerms) {
    errors.agreeTerms = '이용약관에 동의해주세요.'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/** 이메일 인증 메일 발송 전 — 형식만 검사 (인증 완료·다른 필드는 검사하지 않음) */
export function validateSignupEmail(email) {
  const trimmed = email.trim()
  const errors = {}

  if (!trimmed) {
    errors.email = '이메일을 입력해주세요.'
  } else if (!EMAIL_PATTERN.test(trimmed)) {
    errors.email = '올바른 이메일 형식을 입력해주세요.'
  }

  return {
    valid: !errors.email,
    errors,
  }
}

export function getEmailConfirmRedirectTo() {
  if (typeof window === 'undefined') {
    return undefined
  }

  // Keep /auth/callback for PKCE ?code= redirects from {{ .ConfirmationURL }}.
  // Dashboard email templates should prefer token_hash → /auth/confirm (see
  // supabase/fix_auth_email_templates.html) so Gmail-app / other-browser clicks work.
  return new URL('auth/callback', `${window.location.origin}${import.meta.env.BASE_URL}`).href
}

/** @deprecated getEmailConfirmRedirectTo 사용 */
export function getSignupEmailRedirectTo() {
  return getEmailConfirmRedirectTo()
}

function formatAuthError(error) {
  if (!error) {
    return null
  }

  return {
    message: error.message,
    code: error.code,
    status: error.status,
    name: error.name,
  }
}

function logSignupStep(label, success, details) {
  const icon = success ? '✅ 성공' : '❌ 실패'
  if (details !== undefined) {
    console.log(`${icon} — ${label}`, details)
  } else {
    console.log(`${icon} — ${label}`)
  }
}

function logSignUpError(error) {
  if (!error) {
    return
  }

  const formatted = formatSupabaseError(error)

  console.error('[Signup] error.code:', formatted?.code)
  console.error('[Signup] error.message:', formatted?.message)
  console.error('[Signup] error.details:', formatted?.details)
  console.error('[Signup] error.hint:', formatted?.hint)
  console.error('[Signup] error (full):', error)
}

function logProfileSaveError(stage, error) {
  const formatted = formatSupabaseError(error)
  const classification = classifyProfileSaveError(error, stage)

  console.error(`[Signup] profiles 저장 실패 (${stage})`, {
    failureKind: classification.kind,
    failureLabel: classification.label,
    code: formatted?.code,
    message: formatted?.message,
    details: formatted?.details,
    hint: formatted?.hint,
    fullError: error,
  })
}

function isMissingRpcFunction(error) {
  const message = String(error?.message ?? '')

  return (
    error?.code === 'PGRST202' ||
    error?.status === 404 ||
    message.includes('is_username_available') ||
    message.includes('username_available') ||
    message.includes('schema cache') ||
    message.includes('Could not find the function')
  )
}

const USERNAME_AVAILABLE_RPC_CANDIDATES = ['is_username_available', 'username_available']

/** null=미확인, true=RPC 사용 가능, false=DB에 없음(테이블 폴백 고정) */
let usernameAvailabilityRpcState = null

function isProfileAlreadyExistsError(error) {
  const message = (error?.message ?? '').toLowerCase()
  const code = error?.code ?? ''

  return (
    code === '23505' ||
    message.includes('profile already exists') ||
    message.includes('username already taken') ||
    message.includes('duplicate')
  )
}

async function checkDuplicateIdViaTable(loginId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', loginId)
    .maybeSingle()

  if (error) {
    console.error('[Signup] profiles.username 직접 조회 실패', formatAuthError(error), error)

    if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
      throw new Error(
        'profiles 테이블이 없습니다. Supabase SQL Editor에서 supabase/migrations/001_create_profiles.sql을 실행해주세요.',
      )
    }

    throw error
  }

  const available = !data

  return {
    available,
    message: available ? '사용 가능한 아이디입니다.' : '아이디가 이미 존재합니다.',
    source: 'profiles_table',
  }
}

/**
 * Live DB RPC 존재 여부 진단 (회원가입 UI에서 직접 호출하지 않음).
 * - is_username_available / username_available / check_username : 현재 미배포(404)인 경우가 많음
 * - find_username_by_name_email : 계정 찾기에 사용
 */
export async function diagnoseSignupRpcAvailability() {
  const probes = [
    {
      name: 'is_username_available',
      args: { check_username: '__probe__' },
    },
    {
      name: 'username_available',
      args: { check_username: '__probe__' },
    },
    {
      name: 'check_username',
      args: { check_username: '__probe__' },
    },
    {
      name: 'find_username_by_name_email',
      args: { p_name: '__probe__', p_email: 'probe@example.com' },
    },
  ]

  const results = []

  for (const probe of probes) {
    const { error } = await supabase.rpc(probe.name, probe.args)
    results.push({
      name: probe.name,
      ok: !error || !isMissingRpcFunction(error),
      missing: Boolean(error && isMissingRpcFunction(error)),
      error: error ? formatAuthError(error) : null,
    })
  }

  return results
}

export async function checkDuplicateEmail(email) {
  const trimmedEmail = email.trim().toLowerCase()

  if (!trimmedEmail) {
    return {
      available: false,
      message: '이메일을 입력해주세요.',
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .ilike('email', trimmedEmail)
    .maybeSingle()

  if (error) {
    console.error('[Signup] profiles.email 직접 조회 실패', formatAuthError(error), error)

    if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
      throw new Error(
        'profiles 테이블이 없습니다. Supabase SQL Editor에서 supabase/migrations/001_create_profiles.sql을 실행해주세요.',
      )
    }

    throw error
  }

  const available = !data

  return {
    available,
    message: available ? '사용 가능한 이메일입니다.' : '이미 가입된 이메일입니다.',
  }
}

export async function checkDuplicateId(loginId) {
  // Live DB에 public.is_username_available 가 없어 RPC 호출 시 404가 납니다.
  // 아이디 중복확인은 profiles 테이블 조회로 처리하고, OTP 발송과 분리합니다.
  // (RPC를 쓰려면 Supabase SQL Editor에서 supabase/fix_username_available.sql 실행)
  //
  // 선택적으로 RPC를 쓰려면 VITE_USE_USERNAME_RPC=true 로 빌드하세요.
  const useUsernameRpc = import.meta.env.VITE_USE_USERNAME_RPC === 'true'

  if (!useUsernameRpc || usernameAvailabilityRpcState === false) {
    return checkDuplicateIdViaTable(loginId)
  }

  for (const rpcName of USERNAME_AVAILABLE_RPC_CANDIDATES) {
    const { data, error } = await supabase.rpc(rpcName, {
      check_username: loginId,
    })

    if (!error) {
      usernameAvailabilityRpcState = true
      const available = data === true
      return {
        available,
        message: available ? '사용 가능한 아이디입니다.' : '아이디가 이미 존재합니다.',
        source: rpcName,
      }
    }

    if (isMissingRpcFunction(error)) {
      usernameAvailabilityRpcState = false
      console.info(
        '[Signup] username RPC 없음 — profiles 테이블로 중복확인합니다.',
        formatAuthError(error),
      )
      return checkDuplicateIdViaTable(loginId)
    }

    console.error('[Signup] 아이디 중복확인 RPC 실패', rpcName, formatAuthError(error), error)
    // RPC 오류로 회원가입/이메일 인증을 중단하지 않고 테이블 조회로 계속합니다.
    return checkDuplicateIdViaTable(loginId)
  }

  return checkDuplicateIdViaTable(loginId)
}

/** 이메일 본문의 6자리 인증번호로 인증 (매직링크/PKCE 없이 동작) */
export async function verifyEmailOtpCode(email, token) {
  const trimmedEmail = email.trim().toLowerCase()
  const trimmedToken = String(token ?? '').trim()

  if (!trimmedEmail) {
    return { success: false, message: '이메일을 입력해주세요.' }
  }

  if (!/^\d{6,8}$/.test(trimmedToken)) {
    return { success: false, message: '이메일로 받은 6자리 인증번호를 입력해주세요.' }
  }

  const otpTypes = ['email', 'signup', 'magiclink']
  let data = null
  let error = null

  for (const type of otpTypes) {
    const result = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type,
    })

    if (!result.error) {
      data = result.data
      error = null
      break
    }

    error = result.error
  }

  if (error) {
    console.error('[Signup] verifyEmailOtpCode 실패', formatAuthError(error), error)
    return {
      success: false,
      message: mapEmailVerificationError(error),
      error: formatAuthError(error),
    }
  }

  const user = data?.session?.user ?? data?.user

  if (!user?.email || !isEmailConfirmed(user)) {
    return {
      success: false,
      message: '이메일 인증 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.',
    }
  }

  if (user.email.toLowerCase() !== trimmedEmail) {
    return {
      success: false,
      message: '인증된 이메일과 입력 이메일이 일치하지 않습니다.',
    }
  }

  return {
    success: true,
    verified: true,
    user,
    session: data.session ?? null,
    message: SIGNUP_EMAIL_ALREADY_VERIFIED_MESSAGE,
  }
}

function isEmailConfirmed(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at)
}

function evaluateEmailVerification(user, trimmedEmail) {
  if (!user?.email) {
    return { verified: false, emailMatch: false, reason: 'no_session' }
  }

  const emailMatch = user.email.toLowerCase() === trimmedEmail

  if (!emailMatch) {
    return {
      verified: false,
      emailMatch: false,
      reason: 'email_mismatch',
      sessionEmail: user.email,
    }
  }

  const confirmed = isEmailConfirmed(user)

  return {
    verified: confirmed,
    emailMatch: true,
    reason: confirmed ? 'verified' : 'not_confirmed',
  }
}

async function refreshAuthSessionIfPresent() {
  const session = await syncSupabaseAuthSession({ retries: 2, retryDelayMs: 150 })
  return session
}

export async function checkEmailVerificationStatus(expectedEmail) {
  const trimmedEmail = expectedEmail.trim().toLowerCase()
  const beacon = peekEmailVerifiedBeacon(trimmedEmail)
  const syncRetries = beacon ? 12 : 4
  const syncDelayMs = beacon ? 300 : 200

  const checkSession = async () => {
    // Callback tab persists the PKCE session in localStorage; re-read it here.
    await syncSupabaseAuthSession({ retries: syncRetries, retryDelayMs: syncDelayMs })

    try {
      await supabase.auth.refreshSession()
    } catch (error) {
      console.warn('[Signup] refreshSession during email check failed', error)
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user) {
      const sessionResult = evaluateEmailVerification(session.user, trimmedEmail)

      if (sessionResult.verified) {
        return {
          verified: true,
          user: session.user,
          source: 'session',
          reason: 'verified',
        }
      }
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      const isMissingSession =
        userError.message?.includes('Auth session missing') ||
        userError.name === 'AuthSessionMissingError'

      if (isMissingSession) {
        return null
      }

      console.error('[Signup] getUser 실패', formatSupabaseError(userError), userError)
      return {
        verified: false,
        reason: 'auth_error',
        error: formatSupabaseError(userError),
        hint: '인증 상태 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      }
    }

    const userResult = evaluateEmailVerification(user, trimmedEmail)

    if (userResult.verified) {
      return {
        verified: true,
        user,
        source: 'getUser',
        reason: 'verified',
      }
    }

    if (userResult.reason === 'email_mismatch') {
      return {
        verified: false,
        user,
        reason: 'email_mismatch',
        sessionEmail: userResult.sessionEmail,
        hint: `다른 계정(${userResult.sessionEmail})으로 로그인되어 있습니다. 로그아웃 후 다시 시도해주세요.`,
      }
    }

    return {
      verified: false,
      user,
      reason: userResult.reason ?? 'not_confirmed',
    }
  }

  let result = await checkSession()

  if (result?.verified) {
    return result
  }

  if (beacon && !result?.verified) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 500)
      })

      result = await checkSession()

      if (result?.verified) {
        return result
      }
    }

    return {
      verified: false,
      reason: 'pending_sync',
      hint: '인증 링크 처리는 완료되었습니다. 잠시 후 다시 확인해주세요.',
    }
  }

  if (result?.reason === 'auth_error' || result?.reason === 'email_mismatch') {
    return {
      ...result,
      hint:
        result.hint ??
        '인증 상태 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    }
  }

  if (!result) {
    return {
      verified: false,
      reason: 'no_session',
      hint: '인증 메일의 링크를 클릭한 뒤, 다시 확인해주세요.',
    }
  }

  return {
    verified: false,
    user: result.user,
    reason: result.reason ?? 'not_confirmed',
    hint: '아직 이메일 인증이 완료되지 않았습니다. 메일함의 인증 링크를 클릭해주세요.',
  }
}

export async function sendEmailVerification(email, { source = 'signup-email-verify' } = {}) {
  const trimmedEmail = email.trim().toLowerCase()
  const emailRedirectTo = getEmailConfirmRedirectTo()

  // 아이디 RPC(is_username_available)와 무관합니다.
  // 이메일 중복만 확인한 뒤 바로 OTP를 발송합니다.
  try {
    const duplicateEmail = await checkDuplicateEmail(trimmedEmail)

    if (!duplicateEmail.available) {
      return {
        success: false,
        message: duplicateEmail.message,
      }
    }
  } catch (error) {
    console.error('[Signup] 이메일 중복확인 실패', error)
    return {
      success: false,
      message: '이메일 중복확인에 실패했습니다. 다시 시도해주세요.',
    }
  }

  const existing = await checkEmailVerificationStatus(trimmedEmail)

  if (existing.verified) {
    return {
      success: true,
      alreadyVerified: true,
      message: SIGNUP_EMAIL_ALREADY_VERIFIED_MESSAGE,
    }
  }

  console.log('[Signup] signInWithOtp start', {
    email: trimmedEmail,
    emailRedirectTo,
    source,
    origin: typeof window !== 'undefined' ? window.location.origin : null,
    baseUrl: import.meta.env.BASE_URL,
    pathname: typeof window !== 'undefined' ? window.location.pathname : null,
  })

  const { data, error } = await withAllowedOtpSend(source, () =>
    supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo,
        shouldCreateUser: true,
      },
    }),
  )

  console.log('[Signup] signInWithOtp data:', data)
  logSignUpError(error)

  if (error) {
    return {
      success: false,
      message: mapEmailVerificationError(error),
      error: formatAuthError(error),
    }
  }

  return {
    success: true,
    message: SIGNUP_EMAIL_SENT_MESSAGE,
  }
}

async function fetchProfileByUserId(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, email')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.warn('[Signup] profiles 조회 실패', formatSupabaseError(error))
    return null
  }

  return data
}

async function verifySignupCompleted(userId, formData) {
  const profile = await fetchProfileByUserId(userId)

  if (!profile) {
    return { completed: false, profile: null }
  }

  const formEmail = formData.email.trim().toLowerCase()
  const username = formData.loginId.trim()
  const emailMatches = profile.email?.toLowerCase() === formEmail
  const usernameMatches = profile.username === username

  return {
    completed: emailMatches && usernameMatches,
    profile,
  }
}

async function stepCheckDuplicateId(loginId) {
  try {
    const result = await checkDuplicateId(loginId.trim())

    if (!result.available) {
      logSignupStep('아이디 중복 검사', false, result.message)
      return {
        success: false,
        step: 'duplicate',
        message: '아이디가 이미 존재합니다.',
      }
    }

    logSignupStep('아이디 중복 검사', true)
    return { success: true }
  } catch (error) {
    logSignupStep('아이디 중복 검사', false, error)
    return {
      success: false,
      step: 'duplicate',
      message: '아이디 중복확인에 실패했습니다. 다시 시도해주세요.',
      error: formatAuthError(error),
    }
  }
}

async function stepCheckEmailVerification(formData) {
  try {
    const result = await checkEmailVerificationStatus(formData.email)

    if (!result.verified || !result.user) {
      logSignupStep('이메일 인증 확인', false, {
        verified: result.verified,
        email: formData.email.trim().toLowerCase(),
      })

      return {
        success: false,
        step: 'email',
        message: SIGNUP_EMAIL_NOT_VERIFIED_MESSAGE,
      }
    }

    const formEmail = formData.email.trim().toLowerCase()

    if (result.user.email?.toLowerCase() !== formEmail) {
      logSignupStep('이메일 인증 확인', false, '이메일 불일치')
      return {
        success: false,
        step: 'email',
        message: '인증된 이메일과 입력 이메일이 일치하지 않습니다.',
      }
    }

    logSignupStep('이메일 인증 확인', true, {
      userId: result.user.id,
      emailConfirmedAt: result.user.email_confirmed_at,
    })

    return { success: true, user: result.user }
  } catch (error) {
    logSignupStep('이메일 인증 확인', false, error)
    return {
      success: false,
      step: 'email',
      message: SIGNUP_EMAIL_NOT_VERIFIED_MESSAGE,
      error: formatAuthError(error),
    }
  }
}

async function stepEnsureAuthUser(user) {
  logSignupStep('supabase.auth.signUp()', true, {
    note: 'OTP 사전 인증 — auth.users에 사용자 이미 존재',
    userId: user.id,
    email: user.email,
    emailConfirmedAt: user.email_confirmed_at,
  })

  return { success: true, user }
}

async function stepValidateSignupForm(formData) {
  const validation = validateForm(formData, { isIdChecked: true, isEmailVerified: true })

  if (!validation.valid) {
    const message =
      validation.errors.birthDate ||
      validation.errors.loginId ||
      validation.errors.password ||
      validation.errors.name ||
      validation.errors.email ||
      '입력 정보를 확인해주세요.'

    logSignupStep('회원가입 입력값 검증', false, validation.errors)

    return {
      success: false,
      step: 'validation',
      message,
      errors: validation.errors,
    }
  }

  const birthDate = resolveBirthDateForDatabase(formData.birthDate)

  if (!birthDate) {
    logSignupStep('회원가입 입력값 검증', false, 'birth_date empty or invalid')

    return {
      success: false,
      step: 'birthDate',
      message: '생년월일을 올바르게 선택해주세요.',
      errors: { birthDate: '생년월일을 올바르게 선택해주세요.' },
    }
  }

  logSignupStep('회원가입 입력값 검증', true)
  return { success: true, birthDate }
}

async function stepSaveProfile(userId, formData) {
  const existingProfile = await fetchProfileByUserId(userId)

  if (existingProfile) {
    const verification = await verifySignupCompleted(userId, formData)

    if (verification.completed) {
      logSignupStep('create_profile_after_signup()', true, { note: '이미 저장됨', profileId: existingProfile.id })
      logSignupStep('profiles 저장', true, { note: '기존 profile 사용' })
      return { success: true, profileId: existingProfile.id, alreadyExists: true }
    }

    logSignupStep('profiles 저장', false, '다른 사용자 profile 충돌')
    return {
      success: false,
      step: 'profile',
      message: '이미 회원가입이 완료된 계정입니다.',
    }
  }

  try {
    const profileError = await insertProfile(userId, formData)

    if (profileError) {
      if (isProfileAlreadyExistsError(profileError)) {
        const verification = await verifySignupCompleted(userId, formData)

        if (verification.completed) {
          logSignupStep('create_profile_after_signup()', true, {
            note: '중복 오류였으나 profile 확인됨',
            profileId: verification.profile.id,
          })
          logSignupStep('profiles 저장', true, { note: '저장 확인됨' })
          return { success: true, profileId: verification.profile.id, recovered: true }
        }
      }

      logSignupStep('create_profile_after_signup()', false, formatSupabaseError(profileError))
      logSignupStep('profiles 저장', false, formatSupabaseError(profileError))

      return {
        success: false,
        step: 'profile',
        message: mapSupabaseProfileError(profileError),
        error: formatSupabaseError(profileError),
      }
    }

    const savedProfile = await fetchProfileByUserId(userId)

    logSignupStep('create_profile_after_signup()', true, { profileId: savedProfile?.id ?? null })
    logSignupStep('profiles 저장', true, { profileId: savedProfile?.id ?? null })

    return { success: true, profileId: savedProfile?.id ?? null }
  } catch (error) {
    const verification = await verifySignupCompleted(userId, formData)

    if (verification.completed) {
      logSignupStep('create_profile_after_signup()', true, { note: '예외 후 profile 확인됨', error })
      logSignupStep('profiles 저장', true, { note: '복구 성공' })
      return { success: true, profileId: verification.profile.id, recovered: true }
    }

    logSignupStep('create_profile_after_signup()', false, error)
    logSignupStep('profiles 저장', false, error)

    return {
      success: false,
      step: 'profile',
      message: mapSupabaseProfileError(error),
      error: formatAuthError(error),
    }
  }
}

async function stepUpdateAuthPassword(user, formData) {
  if (!formData.password) {
    logSignupStep('updateUser(password)', true, { note: '비밀번호 없음 — skip' })
    return { success: true }
  }

  try {
    const { data, error } = await supabase.auth.updateUser({
      password: formData.password,
      data: {
        name: formData.name.trim(),
        username: formData.loginId.trim(),
      },
    })

    if (error) {
      logSignUpError(error)
      logSignupStep('updateUser(password)', false, formatAuthError(error))

      const verification = await verifySignupCompleted(user.id, formData)

      if (verification.completed) {
        console.warn('[Signup] updateUser 실패했으나 profile 저장 확인 — 회원가입 성공 처리')
        return { success: true, passwordUpdateFailed: true, error: formatAuthError(error) }
      }

      return {
        success: false,
        step: 'auth_update',
        message: mapSupabaseAuthError(error),
        error: formatAuthError(error),
      }
    }

    logSignupStep('updateUser(password)', true, { userId: data.user?.id ?? user.id })
    return { success: true }
  } catch (error) {
    logSignupStep('updateUser(password)', false, error)

    const verification = await verifySignupCompleted(user.id, formData)

    if (verification.completed) {
      console.warn('[Signup] updateUser 예외였으나 profile 저장 확인 — 회원가입 성공 처리')
      return { success: true, passwordUpdateFailed: true, error: formatAuthError(error) }
    }

    return {
      success: false,
      step: 'auth_update',
      message: mapSupabaseAuthError(error),
      error: formatAuthError(error),
    }
  }
}

export async function releasePostSignupSession() {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.warn('[Signup] 회원가입 완료 후 signOut 실패', formatAuthError(error), error)
    } else {
      logSignupStep('회원가입 후 세션 해제', true)
    }
  } catch (error) {
    console.warn('[Signup] 회원가입 완료 후 signOut 예외', error)
  }

  clearAuthSession()
}

export async function handleSignup(formData) {
  console.group('[Signup]')

  try {
    const duplicateStep = await stepCheckDuplicateId(formData.loginId)

    if (!duplicateStep.success) {
      logSignupStep('회원가입 최종 결과', false, duplicateStep)
      console.groupEnd()
      return { success: false, ...duplicateStep }
    }

    try {
      const duplicateEmailStep = await checkDuplicateEmail(formData.email)

      if (!duplicateEmailStep.available) {
        const emailFailure = {
          success: false,
          step: 'duplicate_email',
          message: duplicateEmailStep.message,
        }
        logSignupStep('이메일 중복 검사', false, emailFailure)
        logSignupStep('회원가입 최종 결과', false, emailFailure)
        console.groupEnd()
        return emailFailure
      }

      logSignupStep('이메일 중복 검사', true)
    } catch (error) {
      const emailFailure = {
        success: false,
        step: 'duplicate_email',
        message: '이메일 중복확인에 실패했습니다. 다시 시도해주세요.',
        error: formatAuthError(error),
      }
      logSignupStep('이메일 중복 검사', false, emailFailure)
      logSignupStep('회원가입 최종 결과', false, emailFailure)
      console.groupEnd()
      return emailFailure
    }

    const emailStep = await stepCheckEmailVerification(formData)

    if (!emailStep.success) {
      logSignupStep('회원가입 최종 결과', false, emailStep)
      console.groupEnd()
      return { success: false, ...emailStep }
    }

    const authStep = await stepEnsureAuthUser(emailStep.user)

    if (!authStep.success) {
      logSignupStep('회원가입 최종 결과', false, authStep)
      console.groupEnd()
      return { success: false, ...authStep }
    }

    const user = authStep.user

    const formValidationStep = await stepValidateSignupForm(formData)

    if (!formValidationStep.success) {
      logSignupStep('회원가입 최종 결과', false, formValidationStep)
      console.groupEnd()
      return { success: false, ...formValidationStep }
    }

    const profileStep = await stepSaveProfile(user.id, formData)

    if (!profileStep.success) {
      logSignupStep('회원가입 최종 결과', false, profileStep)
      console.groupEnd()
      return { success: false, ...profileStep }
    }

    const passwordStep = await stepUpdateAuthPassword(user, formData)

    if (!passwordStep.success) {
      logSignupStep('회원가입 최종 결과', false, passwordStep)
      console.groupEnd()
      return { success: false, ...passwordStep }
    }

    const finalVerification = await verifySignupCompleted(user.id, formData)

    if (!finalVerification.completed) {
      logSignupStep('회원가입 최종 결과', false, '최종 profile 검증 실패')
      console.groupEnd()
      return {
        success: false,
        step: 'verify',
        message: '회원 정보 저장을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.',
      }
    }

    logSignupStep('회원가입 최종 결과', true, {
      userId: user.id,
      profileId: finalVerification.profile.id,
      passwordUpdateFailed: passwordStep.passwordUpdateFailed ?? false,
    })

    await releasePostSignupSession()
    console.groupEnd()

    return {
      success: true,
      authUserCreated: true,
      authUserId: user.id,
      profileId: finalVerification.profile.id,
      message: SIGNUP_COMPLETE_MESSAGE,
    }
  } catch (error) {
    console.error('[Signup] handleSignup 예외', error)
    logSignupStep('회원가입 최종 결과', false, error)
    console.groupEnd()

    return {
      success: false,
      step: 'unknown',
      message: '회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      error: formatAuthError(error),
    }
  }
}

/** @deprecated handleSignup 사용 */
export const handleProfileRegistration = handleSignup

async function insertProfile(userId, formData) {
  const phone = formData.phone.trim()
  const username = formData.loginId.trim()
  const name = formData.name.trim()
  const birthDate = resolveBirthDateForDatabase(formData.birthDate)
  const email = formData.email.trim().toLowerCase()

  if (!birthDate) {
    return {
      code: '22007',
      message: 'invalid input syntax for type date: ""',
    }
  }

  const congregantType = CONGREGANT_TYPE_IDS.has(formData.congregantType)
    ? formData.congregantType
    : null
  const attendingChurch = isOtherCongregantType(congregantType)
    ? formData.attendingChurch.trim() || null
    : null

  const profilePayload = {
    user_id: userId,
    username,
    name,
    birth_date: birthDate,
    email,
    phone: phone || null,
    role: DEFAULT_MEMBER_ROLE,
    congregant_type: congregantType,
    attending_church: attendingChurch,
  }

  const { error: insertError } = await supabase.from('profiles').insert(profilePayload)

  if (!insertError) {
    const { error: securityError } = await supabase.rpc('set_profile_security_recovery', {
      p_user_id: userId,
      p_security_question: resolveSecurityQuestionForStorage(formData),
      p_security_answer: formData.securityAnswer.trim(),
    })

    if (!securityError) {
      return null
    }

    logProfileSaveError('security_recovery', securityError)
    return securityError
  }

  logProfileSaveError('direct_insert', insertError)

  const rpcParams = {
    p_user_id: userId,
    p_username: username,
    p_name: name,
    p_birth_date: birthDate,
    p_email: email,
    p_phone: phone || null,
    p_security_question: resolveSecurityQuestionForStorage(formData),
    p_security_answer: formData.securityAnswer.trim(),
    p_congregant_type: congregantType,
    p_attending_church: attendingChurch,
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc('create_profile_after_signup', rpcParams)

  if (!rpcError) {
    return null
  }

  logProfileSaveError('rpc', rpcError)

  if (isProfileAlreadyExistsError(rpcError)) {
    const verification = await verifySignupCompleted(userId, formData)

    if (verification.completed) {
      return null
    }
  }

  return rpcError
}

export function formatPhoneNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11)

  if (digits.length <= 3) {
    return digits
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}
