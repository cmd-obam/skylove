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
  validatePassword,
  validateSignupEmail,
  validateSignupProfileFields,
} from '@/services/auth/signup'

export const OAUTH_PROFILE_COMPLETE_PATH = '/oauth/complete'

/** auth.users 트리거(migration 028)가 만드는 미완성 profile 행의 생년월일 sentinel */
const STUB_PROFILE_BIRTH_DATE = '1900-01-01'

export function getOAuthHomeUrl() {
  const base = String(import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${base}/`
}

/**
 * 회원가입 절차를 끝낸 profile 인지 판별합니다.
 * auth 트리거가 선행 생성한 stub 행은 아직 가입 미완료로 봅니다.
 */
export function isSignupCompletedProfile(profile) {
  if (!profile) {
    return false
  }

  return profile.birthday !== STUB_PROFILE_BIRTH_DATE
}

/**
 * 카카오 회원가입 검증 — 일반 회원가입과 동일하게
 * 아이디·비밀번호·비밀번호 확인·이메일 및 공통 프로필 필드를 검사합니다.
 * 이메일은 카카오 계정 값을 그대로 쓰므로 형식만 확인합니다.
 */
export function validateOAuthProfileForm(form, { isIdChecked = false } = {}) {
  const { errors } = validateSignupProfileFields(form, { isIdChecked })

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

function isSamePasswordError(error) {
  const code = String(error?.code ?? '')
  const message = String(error?.message ?? '').toLowerCase()

  return code === 'same_password' || message.includes('should be different')
}

/**
 * 카카오 계정과 아이디+비밀번호 로그인을 같은 회원으로 연결하기 위해
 * 현재 OAuth 세션의 auth 계정에 비밀번호를 저장합니다.
 * 일반 회원가입의 updateUser(password) 단계와 동일한 방식입니다.
 */
async function saveAuthPassword(formData) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: formData.password,
      data: {
        name: String(formData.name ?? '').trim(),
        username: String(formData.loginId ?? '').trim(),
      },
    })

    // 재시도 시 같은 비밀번호를 다시 저장하는 경우는 정상 처리합니다.
    if (!error || isSamePasswordError(error)) {
      return { success: true }
    }

    console.error('[OAuthProfile] updateUser(password) failed', error)

    return {
      success: false,
      message: '비밀번호 저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
      errors: { password: '비밀번호를 저장하지 못했습니다. 다시 시도해주세요.' },
      error,
    }
  } catch (error) {
    console.error('[OAuthProfile] updateUser(password) threw', error)

    return {
      success: false,
      message: '비밀번호 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      error,
    }
  }
}

async function finalizeOAuthProfile(userId, formData) {
  const { error: securityError } = await supabase.rpc('set_profile_security_recovery', {
    p_user_id: userId,
    p_security_question: resolveSecurityQuestionForStorage(formData),
    p_security_answer: normalizeAnswer(formData.securityAnswer),
  })

  if (securityError) {
    console.warn('[OAuthProfile] set_profile_security_recovery failed', securityError)
  }

  const saved = await fetchProfileByUserId(userId)

  return { success: true, profile: saved.profile ?? null }
}

async function updateOAuthProfileRow(userId, formData, fullPayload) {
  const { error } = await supabase.from('profiles').update(fullPayload).eq('user_id', userId)

  if (error) {
    console.error('[OAuthProfile] profiles UPDATE failed', {
      code: error.code,
      message: error.message,
      details: error.details,
    })

    return {
      success: false,
      message: '회원 정보 저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
      error,
    }
  }

  return finalizeOAuthProfile(userId, formData)
}

/**
 * 카카오 회원가입의 profiles 행을 저장합니다.
 * 일반 회원가입과 동일하게 username·비밀번호를 함께 반영하며,
 * auth 트리거가 만든 stub 행이 있으면 INSERT 대신 UPDATE 로 채웁니다.
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
  const existingProfile = existing.success ? existing.profile : null

  if (isSignupCompletedProfile(existingProfile)) {
    return { success: true, profile: existingProfile, alreadyExists: true }
  }

  const requestedUsername = String(formData.loginId ?? '').trim()
  const duplicate = await checkDuplicateId(requestedUsername)
  // stub 행이 선점한 아이디는 본인 소유이므로 중복으로 보지 않습니다.
  const ownsRequestedUsername = existingProfile?.username === requestedUsername

  if (!duplicate.available && !ownsRequestedUsername) {
    return {
      success: false,
      message: duplicate.message || '이미 사용 중인 아이디입니다.',
      errors: { loginId: '아이디가 이미 존재합니다.' },
    }
  }

  // 프로필보다 비밀번호를 먼저 반영해, 실패 시 같은 화면에서 재시도할 수 있게 합니다.
  const passwordResult = await saveAuthPassword(formData)

  if (!passwordResult.success) {
    return passwordResult
  }

  const { basePayload, fullPayload } = buildOAuthProfilePayload(userId, formData, birthDate)

  if (existingProfile) {
    return updateOAuthProfileRow(userId, formData, fullPayload)
  }

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
    return finalizeOAuthProfile(userId, formData)
  }

  if (isProfileAlreadyExistsError(insertError)) {
    // 동시성으로 stub 이 생긴 경우 UPDATE 로 재시도합니다.
    const updated = await updateOAuthProfileRow(userId, formData, fullPayload)

    if (updated.success) {
      return updated
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
