import { supabase } from '@/lib/supabase'
import {
  normalizeChurchInformation,
} from '@/data/congregantTypes'
import { resolveSecurityQuestionForStorage } from '@/data/securityQuestions'
import { DEFAULT_MEMBER_ROLE } from '@/services/auth/profileSchema'
import { fetchProfileByUserId } from '@/services/auth/profile'
import { normalizeAnswer } from '@/services/auth/normalizeAnswer'
import {
  checkDuplicateId,
  formatPhoneNumber,
  resolveBirthDateForDatabase,
  validateSignupEmail,
  validateSignupProfileFields,
} from '@/services/auth/signup'

export const OAUTH_PROFILE_COMPLETE_PATH = '/oauth/complete'

export function getOAuthHomeUrl() {
  const base = String(import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${base}/`
}

/**
 * 카카오 추가정보 입력 검증 — 일반 회원가입 공통 필드 검증을 재사용합니다.
 * 비밀번호·이메일 OTP·약관 단계는 OAuth 경로에 없으므로 제외하고,
 * 제공된 이메일 형식만 확인합니다.
 */
export function validateOAuthProfileForm(form, { isIdChecked = false } = {}) {
  const { errors } = validateSignupProfileFields(form, { isIdChecked })

  const emailValidation = validateSignupEmail(form.email || '')
  if (!emailValidation.valid) {
    errors.email = emailValidation.errors.email
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
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

function buildOAuthProfilePayload(userId, formData, birthDate) {
  const churchInformation = normalizeChurchInformation(
    formData.congregantType,
    formData.attendingChurch,
  )
  const { congregantType, attendingChurch } = churchInformation

  const basePayload = {
    user_id: userId,
    username: formData.loginId.trim(),
    name: formData.name.trim(),
    birth_date: birthDate,
    email: String(formData.email || '').trim().toLowerCase() || null,
    phone: String(formData.phone || '').trim() || null,
    role: DEFAULT_MEMBER_ROLE,
  }

  return {
    basePayload,
    fullPayload: {
      ...basePayload,
      congregant_type: congregantType,
      attending_church: attendingChurch,
    },
  }
}

/**
 * OAuth 최초 로그인 사용자의 profiles 행을 생성합니다.
 * 기존 이메일 회원가입 insertProfile 과 분리된 전용 경로이며,
 * 동일 컬럼(congregant_type, attending_church 포함)에 저장합니다.
 */
export async function createOAuthProfile(userId, formData) {
  const birthDate = resolveBirthDateForDatabase(formData.birthDate)

  if (!userId) {
    return { success: false, message: '로그인 세션이 없습니다. 다시 간편 로그인을 진행해주세요.' }
  }

  if (!birthDate) {
    return {
      success: false,
      message: '생년월일을 올바르게 선택해주세요.',
      errors: { birthDate: '생년월일을 선택해주세요.' },
    }
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

  const { basePayload, fullPayload } = buildOAuthProfilePayload(userId, formData, birthDate)

  const { error: insertError } = await supabase.from('profiles').insert(fullPayload)

  if (insertError) {
    console.warn('[OAuthProfile] profiles INSERT failed', {
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      payloadKeys: Object.keys(fullPayload),
    })
  }

  if (!insertError) {
    const { error: securityError } = await supabase.rpc('set_profile_security_recovery', {
      p_user_id: userId,
      p_security_question: resolveSecurityQuestionForStorage(formData),
      p_security_answer: normalizeAnswer(formData.securityAnswer),
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
    p_security_answer: normalizeAnswer(formData.securityAnswer),
    p_congregant_type: fullPayload.congregant_type,
    p_attending_church: fullPayload.attending_church,
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
