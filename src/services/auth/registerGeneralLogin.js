import { resolveSecurityQuestionForStorage, SECURITY_CUSTOM_QUESTION_ID } from '@/data/securityQuestions'
import { normalizeAnswer } from '@/services/auth/normalizeAnswer'
import { fetchProfileByUserId } from '@/services/auth/profile'
import { checkDuplicateId, validatePassword } from '@/services/auth/signup'
import { getAccountLoginMethods } from '@/services/auth/unlinkKakao'
import { supabase } from '@/lib/supabase'

function isSamePasswordError(error) {
  const code = String(error?.code ?? '')
  const message = String(error?.message ?? '').toLowerCase()

  return code === 'same_password' || message.includes('should be different')
}

/**
 * 일반 로그인 등록 폼 검증 (아이디·비밀번호·보안질문만 — 프로필/약관 필드는 제외)
 */
export function validateGeneralLoginForm(form, { isIdChecked = false } = {}) {
  const errors = {}
  const loginId = String(form.loginId ?? '').trim()
  const securityCustomQuestion = String(form.securityCustomQuestion ?? '')
  const securityAnswer = String(form.securityAnswer ?? '')

  if (!loginId) {
    errors.loginId = '아이디를 입력해주세요.'
  } else if (!/^[a-zA-Z0-9_]{4,20}$/.test(loginId)) {
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
    !securityCustomQuestion.trim()
  ) {
    errors.securityCustomQuestion = '직접 입력 질문을 입력해주세요.'
  }

  if (!securityAnswer.trim()) {
    errors.securityAnswer = securityAnswer
      ? '비밀번호 분실 시 답변에 공백만 입력할 수 없습니다.'
      : '비밀번호 분실 시 답변을 입력해주세요.'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * 카카오 전용 계정에 아이디·비밀번호·보안질문을 등록합니다.
 * 이메일 인증은 재진행하지 않습니다.
 */
export async function registerGeneralLogin(formData, { isIdChecked = false } = {}) {
  const validation = validateGeneralLoginForm(formData, { isIdChecked })

  if (!validation.valid) {
    return {
      success: false,
      message: '입력 내용을 확인해주세요.',
      errors: validation.errors,
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

  const requestedUsername = String(formData.loginId ?? '').trim()
  const profileResult = await fetchProfileByUserId(user.id)
  const existingProfile = profileResult.success ? profileResult.profile : null
  const ownsRequestedUsername = existingProfile?.username === requestedUsername

  const duplicate = await checkDuplicateId(requestedUsername)

  if (!duplicate.available && !ownsRequestedUsername) {
    return {
      success: false,
      message: duplicate.message || '이미 사용 중인 아이디입니다.',
      errors: { loginId: '아이디가 이미 존재합니다.' },
    }
  }

  const { error: passwordError } = await supabase.auth.updateUser({
    password: formData.password,
    data: {
      username: requestedUsername,
      general_login_registered: true,
    },
  })

  if (passwordError && !isSamePasswordError(passwordError)) {
    console.error('[RegisterGeneralLogin] updateUser(password) failed', passwordError)
    return {
      success: false,
      message: '비밀번호 저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
      errors: { password: '비밀번호를 저장하지 못했습니다. 다시 시도해주세요.' },
      error: passwordError,
    }
  }

  const { error: usernameError } = await supabase
    .from('profiles')
    .update({ username: requestedUsername })
    .eq('user_id', user.id)

  if (usernameError) {
    console.error('[RegisterGeneralLogin] profiles.username update failed', usernameError)
    return {
      success: false,
      message: '아이디 저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
      errors: { loginId: '아이디를 저장하지 못했습니다. 다시 시도해주세요.' },
      error: usernameError,
    }
  }

  const { error: securityError } = await supabase.rpc('set_profile_security_recovery', {
    p_user_id: user.id,
    p_security_question: resolveSecurityQuestionForStorage(formData),
    p_security_answer: normalizeAnswer(formData.securityAnswer),
  })

  if (securityError) {
    console.error('[RegisterGeneralLogin] set_profile_security_recovery failed', securityError)
    return {
      success: false,
      message: '보안 질문 저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
      errors: {
        securityAnswer: '보안 질문을 저장하지 못했습니다. 다시 시도해주세요.',
      },
      error: securityError,
    }
  }

  await supabase.auth.refreshSession()

  const methods = await getAccountLoginMethods()

  return {
    success: true,
    message:
      '일반 로그인 계정이 정상적으로 등록되었습니다.\n이제 카카오 계정 연동을 해제할 수 있습니다.',
    methods,
  }
}

export { checkDuplicateId }
