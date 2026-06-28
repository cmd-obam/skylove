const SIGNUP_DRAFT_KEY = 'skylove_signup_draft'
const SIGNUP_DISCARDED_KEY = 'skylove_signup_discarded'

export function markSignupDraftDiscarded() {
  try {
    sessionStorage.setItem(SIGNUP_DISCARDED_KEY, '1')
    sessionStorage.removeItem(SIGNUP_DRAFT_KEY)
  } catch (error) {
    console.warn('[Signup] draft discard 표시 실패', error)
  }
}

export function consumeSignupDraftDiscarded() {
  try {
    const discarded = sessionStorage.getItem(SIGNUP_DISCARDED_KEY) === '1'

    if (discarded) {
      sessionStorage.removeItem(SIGNUP_DISCARDED_KEY)
      sessionStorage.removeItem(SIGNUP_DRAFT_KEY)
    }

    return discarded
  } catch (error) {
    console.warn('[Signup] draft discard 확인 실패', error)
    return false
  }
}

export function clearAllSignupStorage() {
  markSignupDraftDiscarded()
}

export function isSignupFormDirty({
  form,
  isIdChecked = false,
  idCheckMessage = '',
  isEmailVerified = false,
  emailSent = false,
  emailStatusMessage = '',
  resendAvailableAt = null,
}) {
  const hasFormInput =
    Boolean(form.loginId?.trim()) ||
    Boolean(form.password) ||
    Boolean(form.passwordConfirm) ||
    Boolean(form.name?.trim()) ||
    Boolean(form.birthDate) ||
    Boolean(form.email?.trim()) ||
    Boolean(form.phone?.trim()) ||
    Boolean(form.agreePrivacy) ||
    Boolean(form.agreeTerms) ||
    Boolean(form.agreeEmail)

  const hasSignupProgress =
    isIdChecked ||
    Boolean(idCheckMessage) ||
    isEmailVerified ||
    emailSent ||
    Boolean(emailStatusMessage) ||
    Boolean(resendAvailableAt)

  return hasFormInput || hasSignupProgress
}

export function loadSignupDraft() {
  try {
    if (sessionStorage.getItem(SIGNUP_DISCARDED_KEY) === '1') {
      return null
    }

    const raw = sessionStorage.getItem(SIGNUP_DRAFT_KEY)

    if (!raw) {
      return null
    }

    return JSON.parse(raw)
  } catch (error) {
    console.warn('[Signup] draft 복원 실패', error)
    return null
  }
}

export function saveSignupDraft(draft) {
  try {
    if (sessionStorage.getItem(SIGNUP_DISCARDED_KEY) === '1') {
      return
    }

    sessionStorage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify(draft))
  } catch (error) {
    console.warn('[Signup] draft 저장 실패', error)
  }
}

export function clearSignupDraft() {
  sessionStorage.removeItem(SIGNUP_DRAFT_KEY)
  sessionStorage.removeItem(SIGNUP_DISCARDED_KEY)
}

export function getResendCooldownRemaining(resendAvailableAt) {
  if (!resendAvailableAt) {
    return 0
  }

  return Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000))
}
