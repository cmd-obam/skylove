import { supabase } from '@/lib/supabase'
import {
  isCustomSecurityQuestionSelected,
  resolveSecurityQuestionForStorage,
} from '@/data/securityQuestions'
import { DEFAULT_MEMBER_ROLE } from '@/services/auth/profileSchema'
import { fetchProfileByUserId } from '@/services/auth/profile'
import {
  checkDuplicateId,
  formatPhoneNumber,
  resolveBirthDateForDatabase,
} from '@/services/auth/signup'

const LOGIN_ID_PATTERN = /^[a-zA-Z0-9_]{4,20}$/

export const OAUTH_PROFILE_COMPLETE_PATH = '/oauth/complete'

export function getOAuthHomeUrl() {
  const base = String(import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${base || ''}/` || '/'
}

export function validateOAuthProfileForm(form, { isIdChecked = false } = {}) {
  const errors = {}

  if (!form.name?.trim()) {
    errors.name = '이름을 입력해주세요.'
  }

  if (!form.loginId?.trim()) {
    errors.loginId = '회원아이디를 입력해주세요.'
  } else if (!LOGIN_ID_PATTERN.test(form.loginId.trim())) {
    errors.loginId = '아이디는 4~20자의 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.'
  } else if (!isIdChecked) {
    errors.loginId = '아이디 중복확인을 해주세요.'
  }

  if (!resolveBirthDateForDatabase(form.birthDate)) {
    errors.birthDate = '생년월일을 선택해주세요.'
  }

  if (!form.phone?.trim()) {
    errors.phone = '휴대폰 번호를 입력해주세요.'
  }

  if (!form.securityQuestion) {
    errors.securityQuestion = '비밀번호 찾기 질문을 선택해주세요.'
  } else if (
    isCustomSecurityQuestionSelected(form.securityQuestion) &&
    !form.securityCustomQuestion?.trim()
  ) {
    errors.securityCustomQuestion = '질문을 직접 입력해주세요.'
  }

  if (!form.securityAnswer?.trim()) {
    errors.securityAnswer = '비밀번호 찾기 답변을 입력해주세요.'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

function isMissingColumnError(error) {
  const code = error?.code ?? ''
  const message = String(error?.message ?? '').toLowerCase()

  return (
    code === '42703' ||
    code === 'PGRST204' ||
    message.includes('does not exist') ||
    message.includes('could not find the') ||
    message.includes('schema cache')
  )
}

function isProfileAlreadyExistsError(error) {
  const code = String(error?.code ?? '')
  const message = String(error?.message ?? '').toLowerCase()

  return (
    code === '23505' ||
    message.includes('duplicate') ||
    message.includes('already exists') ||
    message.includes('profile already exists')
  )
}

/**
 * OAuth 최초 로그인 사용자의 profiles 행을 생성합니다.
 * 기존 이메일 회원가입 insertProfile 과 분리된 전용 경로입니다.
 */
export async function createOAuthProfile(userId, formData) {
  const birthDate = resolveBirthDateForDatabase(formData.birthDate)

  if (!userId) {
    return { success: false, message: '로그인 세션이 없습니다. 다시 간편 로그인을 진행해주세요.' }
  }

  if (!birthDate) {
    return { success: false, message: '생년월일을 올바르게 선택해주세요.', errors: { birthDate: '생년월일을 선택해주세요.' } }
  }

  const existing = await fetchProfileByUserId(userId)

  if (existing.success && existing.profile) {
    return { success: true, profile: existing.profile, alreadyExists: true }
  }

  const duplicate = await checkDuplicateId(formData.loginId)

  if (!duplicate.available) {
    return {
      success: false,
      message: duplicate.message || '이미 사용 중인 아이디입니다.',
      errors: { loginId: '아이디가 이미 존재합니다.' },
    }
  }

  const email = String(formData.email || '').trim().toLowerCase()
  const basePayload = {
    user_id: userId,
    username: formData.loginId.trim(),
    name: formData.name.trim(),
    birth_date: birthDate,
    email: email || null,
    phone: formData.phone.trim() || null,
    role: DEFAULT_MEMBER_ROLE,
  }

  const payloads = [basePayload]
  let insertError = null

  for (const payload of payloads) {
    const { error } = await supabase.from('profiles').insert(payload)

    if (!error) {
      insertError = null
      break
    }

    insertError = error
    console.warn('[OAuthProfile] profiles INSERT failed', {
      code: error.code,
      message: error.message,
      details: error.details,
    })

    if (!isMissingColumnError(error)) {
      break
    }
  }

  if (!insertError) {
    const { error: securityError } = await supabase.rpc('set_profile_security_recovery', {
      p_user_id: userId,
      p_security_question: resolveSecurityQuestionForStorage(formData),
      p_security_answer: formData.securityAnswer.trim(),
    })

    if (securityError) {
      console.warn('[OAuthProfile] set_profile_security_recovery failed', securityError)
    }

    const saved = await fetchProfileByUserId(userId)
    return {
      success: true,
      profile: saved.profile ?? null,
    }
  }

  if (isProfileAlreadyExistsError(insertError)) {
    const saved = await fetchProfileByUserId(userId)
    if (saved.success && saved.profile) {
      return { success: true, profile: saved.profile, alreadyExists: true }
    }
  }

  const rpcParams = {
    p_user_id: userId,
    p_username: basePayload.username,
    p_name: basePayload.name,
    p_birth_date: birthDate,
    p_email: basePayload.email,
    p_phone: basePayload.phone,
    p_security_question: resolveSecurityQuestionForStorage(formData),
    p_security_answer: formData.securityAnswer.trim(),
  }

  const { error: rpcError } = await supabase.rpc('create_profile_after_signup', rpcParams)

  if (!rpcError) {
    const saved = await fetchProfileByUserId(userId)
    return { success: true, profile: saved.profile ?? null }
  }

  console.error('[OAuthProfile] create_profile_after_signup failed', rpcError)

  return {
    success: false,
    message: '회원 정보 저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
    error: rpcError,
  }
}

export { checkDuplicateId, formatPhoneNumber }
