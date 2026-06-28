import { supabase } from '@/lib/supabase'
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

const LOGIN_ID_PATTERN = /^[a-zA-Z0-9_]{4,20}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^01[0-9]-\d{3,4}-\d{4}$/
const PASSWORD_SPECIAL_CHAR_PATTERN = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/
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

export const PASSWORD_REQUIREMENT_HINT = '8자 이상, 특수문자 포함'
export const PASSWORD_PLACEHOLDER = '8자 이상, 특수문자 포함하여 입력하세요.'
export const PASSWORD_RULE_LIVE_MESSAGE = '8자 이상, 특수문자를 포함하여 입력해주세요.'

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

  if (!isPasswordRuleValid(password)) {
    return PASSWORD_RULE_LIVE_MESSAGE
  }

  return undefined
}

export function validatePassword(password) {
  if (!password) {
    return '비밀번호를 입력해주세요.'
  }

  if (password.length < 8) {
    return '비밀번호는 8자 이상 입력해주세요.'
  }

  if (!PASSWORD_SPECIAL_CHAR_PATTERN.test(password)) {
    return '비밀번호에 특수문자를 포함해주세요.'
  }

  return null
}

export const INITIAL_SIGNUP_FORM = {
  loginId: '',
  password: '',
  passwordConfirm: '',
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
    errors.password = PASSWORD_RULE_LIVE_MESSAGE
  }

  if (!form.passwordConfirm) {
    errors.passwordConfirm = '비밀번호 확인을 입력해주세요.'
  } else if (!passwordError && form.password !== form.passwordConfirm) {
    errors.passwordConfirm = '비밀번호가 일치하지 않습니다.'
  }

  if (!form.name.trim()) {
    errors.name = '이름을 입력해주세요.'
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

export function getEmailConfirmRedirectTo() {
  if (typeof window === 'undefined') {
    return undefined
  }

  return new URL('email-confirm', `${window.location.origin}${import.meta.env.BASE_URL}`).href
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
  return (
    error?.code === 'PGRST202' ||
    error?.message?.includes('is_username_available') ||
    error?.message?.includes('schema cache')
  )
}

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
    message: available ? '사용 가능한 아이디입니다.' : '이미 사용 중인 아이디입니다.',
  }
}

export async function checkDuplicateId(loginId) {
  const { data, error } = await supabase.rpc('is_username_available', {
    check_username: loginId,
  })

  if (!error) {
    const available = data === true

    return {
      available,
      message: available ? '사용 가능한 아이디입니다.' : '이미 사용 중인 아이디입니다.',
    }
  }

  console.error('[Signup] 아이디 중복확인 RPC 실패', formatAuthError(error), error)

  if (isMissingRpcFunction(error)) {
    return checkDuplicateIdViaTable(loginId)
  }

  throw error
}

export async function checkEmailVerificationStatus(expectedEmail) {
  const trimmedEmail = expectedEmail.trim().toLowerCase()

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    console.error('[Signup] getSession 실패', formatSupabaseError(sessionError), sessionError)
    return { verified: false, error: formatSupabaseError(sessionError) }
  }

  if (session?.user) {
    const sessionResult = evaluateEmailVerification(session.user, trimmedEmail)

    if (sessionResult.verified) {
      return { verified: true, user: session.user, source: 'session' }
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error('[Signup] getUser 실패', formatSupabaseError(userError), userError)
    return { verified: false, error: formatSupabaseError(userError) }
  }

  const userResult = evaluateEmailVerification(user, trimmedEmail)

  return {
    verified: userResult.verified,
    user: userResult.verified ? user : undefined,
    source: userResult.verified ? 'getUser' : undefined,
  }
}

function evaluateEmailVerification(user, trimmedEmail) {
  if (!user?.email) {
    return { verified: false, emailMatch: false }
  }

  const emailMatch = user.email.toLowerCase() === trimmedEmail
  const verified = emailMatch && Boolean(user.email_confirmed_at)

  return { verified, emailMatch }
}

export async function sendEmailVerification(email) {
  const trimmedEmail = email.trim().toLowerCase()
  const emailRedirectTo = getEmailConfirmRedirectTo()

  const existing = await checkEmailVerificationStatus(trimmedEmail)

  if (existing.verified) {
    return {
      success: true,
      alreadyVerified: true,
      message: SIGNUP_EMAIL_ALREADY_VERIFIED_MESSAGE,
    }
  }

  const { data, error } = await supabase.auth.signInWithOtp({
    email: trimmedEmail,
    options: {
      emailRedirectTo,
      shouldCreateUser: true,
    },
  })

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
        message: '이미 사용 중인 아이디입니다.',
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

export async function handleSignup(formData) {
  console.group('[Signup]')

  try {
    const duplicateStep = await stepCheckDuplicateId(formData.loginId)

    if (!duplicateStep.success) {
      logSignupStep('회원가입 최종 결과', false, duplicateStep)
      console.groupEnd()
      return { success: false, ...duplicateStep }
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
      message: '회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
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
  const birthDate = normalizeBirthDate(formData.birthDate)
  const email = formData.email.trim().toLowerCase()

  const profilePayload = {
    user_id: userId,
    username,
    name,
    birth_date: birthDate,
    email,
    phone: phone || null,
    role: DEFAULT_MEMBER_ROLE,
  }

  const { error: insertError } = await supabase.from('profiles').insert(profilePayload)

  if (!insertError) {
    return null
  }

  logProfileSaveError('direct_insert', insertError)

  const rpcParams = {
    p_user_id: userId,
    p_username: username,
    p_name: name,
    p_birth_date: birthDate,
    p_email: email,
    p_phone: phone || null,
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
