const SIGNUP_DRAFT_KEY = 'skylove_signup_draft'
const SIGNUP_DISCARDED_KEY = 'skylove_signup_discarded'
const EMAIL_VERIFIED_BEACON_KEY = 'skylove_signup_email_verified'
const SIGNUP_LOCK_KEY = 'skylove_signup_lock'
const SIGNUP_AUTH_CHANNEL = 'skylove-signup-auth'

const SIGNUP_LOCK_TTL_MS = 120_000
const EMAIL_VERIFIED_BEACON_TTL_MS = 30 * 60 * 1000

function getStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}

function readJson(storage, key) {
  try {
    const raw = storage.getItem(key)

    if (!raw) {
      return null
    }

    return JSON.parse(raw)
  } catch (error) {
    console.warn('[Signup] storage read 실패', key, error)
    return null
  }
}

function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('[Signup] storage write 실패', key, error)
  }
}

function migrateDraftFromSessionStorage() {
  const storage = getStorage()

  if (!storage) {
    return
  }

  try {
    if (storage.getItem(SIGNUP_DRAFT_KEY)) {
      return
    }

    const legacyDraft = sessionStorage.getItem(SIGNUP_DRAFT_KEY)

    if (legacyDraft) {
      storage.setItem(SIGNUP_DRAFT_KEY, legacyDraft)
    }

    const legacyDiscarded = sessionStorage.getItem(SIGNUP_DISCARDED_KEY)

    if (legacyDiscarded) {
      storage.setItem(SIGNUP_DISCARDED_KEY, legacyDiscarded)
    }
  } catch (error) {
    console.warn('[Signup] sessionStorage draft 마이그레이션 실패', error)
  }
}

migrateDraftFromSessionStorage()

export function markSignupDraftDiscarded() {
  const storage = getStorage()

  if (!storage) {
    return
  }

  try {
    storage.setItem(SIGNUP_DISCARDED_KEY, '1')
    storage.removeItem(SIGNUP_DRAFT_KEY)
    sessionStorage.removeItem(SIGNUP_DRAFT_KEY)
    sessionStorage.removeItem(SIGNUP_DISCARDED_KEY)
  } catch (error) {
    console.warn('[Signup] draft discard 표시 실패', error)
  }
}

export function consumeSignupDraftDiscarded() {
  const storage = getStorage()

  if (!storage) {
    return false
  }

  try {
    const discarded = storage.getItem(SIGNUP_DISCARDED_KEY) === '1'

    if (discarded) {
      storage.removeItem(SIGNUP_DISCARDED_KEY)
      storage.removeItem(SIGNUP_DRAFT_KEY)
      sessionStorage.removeItem(SIGNUP_DRAFT_KEY)
      sessionStorage.removeItem(SIGNUP_DISCARDED_KEY)
    }

    return discarded
  } catch (error) {
    console.warn('[Signup] draft discard 확인 실패', error)
    return false
  }
}

export function clearAllSignupStorage() {
  markSignupDraftDiscarded()
  clearEmailVerifiedBeacon()
  releaseSignupLock()
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
    Boolean(form.securityQuestion) ||
    Boolean(form.securityCustomQuestion?.trim()) ||
    Boolean(form.securityAnswer?.trim()) ||
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
  const storage = getStorage()

  if (!storage) {
    return null
  }

  try {
    if (storage.getItem(SIGNUP_DISCARDED_KEY) === '1') {
      return null
    }

    const raw = storage.getItem(SIGNUP_DRAFT_KEY)

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
  const storage = getStorage()

  if (!storage) {
    return
  }

  try {
    if (storage.getItem(SIGNUP_DISCARDED_KEY) === '1') {
      return
    }

    storage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify(draft))
  } catch (error) {
    console.warn('[Signup] draft 저장 실패', error)
  }
}

export function clearSignupDraft() {
  const storage = getStorage()

  if (!storage) {
    return
  }

  storage.removeItem(SIGNUP_DRAFT_KEY)
  storage.removeItem(SIGNUP_DISCARDED_KEY)
  sessionStorage.removeItem(SIGNUP_DRAFT_KEY)
  sessionStorage.removeItem(SIGNUP_DISCARDED_KEY)
}

export function getResendCooldownRemaining(resendAvailableAt) {
  if (!resendAvailableAt) {
    return 0
  }

  return Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000))
}

export function setEmailVerifiedBeacon(email) {
  const storage = getStorage()
  const trimmedEmail = email?.trim()?.toLowerCase()

  if (!storage || !trimmedEmail) {
    return
  }

  writeJson(storage, EMAIL_VERIFIED_BEACON_KEY, {
    email: trimmedEmail,
    verifiedAt: Date.now(),
  })
}

export function peekEmailVerifiedBeacon(expectedEmail) {
  const storage = getStorage()
  const trimmedEmail = expectedEmail?.trim()?.toLowerCase()

  if (!storage || !trimmedEmail) {
    return null
  }

  const beacon = readJson(storage, EMAIL_VERIFIED_BEACON_KEY)

  if (!beacon?.email || beacon.email !== trimmedEmail) {
    return null
  }

  if (!beacon.verifiedAt || Date.now() - beacon.verifiedAt > EMAIL_VERIFIED_BEACON_TTL_MS) {
    return null
  }

  return beacon
}

export function clearEmailVerifiedBeacon() {
  const storage = getStorage()

  if (!storage) {
    return
  }

  storage.removeItem(EMAIL_VERIFIED_BEACON_KEY)
}

export function broadcastEmailVerified(email) {
  const trimmedEmail = email?.trim()?.toLowerCase()

  if (!trimmedEmail || typeof window === 'undefined') {
    return
  }

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(SIGNUP_AUTH_CHANNEL)
      channel.postMessage({ type: 'email_verified', email: trimmedEmail, at: Date.now() })
      channel.close()
    } catch (error) {
      console.warn('[Signup] BroadcastChannel 전송 실패', error)
    }
  }
}

export function subscribeEmailVerified(callback) {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return () => {}
  }

  const channel = new BroadcastChannel(SIGNUP_AUTH_CHANNEL)

  const handleMessage = (event) => {
    if (event.data?.type === 'email_verified' && event.data.email) {
      callback(event.data.email)
    }
  }

  channel.addEventListener('message', handleMessage)

  return () => {
    channel.removeEventListener('message', handleMessage)
    channel.close()
  }
}

export function getSupabaseAuthStorageKeyHint() {
  const storage = getStorage()

  if (!storage) {
    return null
  }

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)

    if (key && key.includes('-auth-token')) {
      return key
    }
  }

  return null
}

export function tryAcquireSignupLock(owner = 'signup') {
  const storage = getStorage()

  if (!storage) {
    return { acquired: true, owner }
  }

  const now = Date.now()
  const existing = readJson(storage, SIGNUP_LOCK_KEY)

  if (existing?.owner && existing?.acquiredAt && now - existing.acquiredAt < SIGNUP_LOCK_TTL_MS) {
    return { acquired: false, owner: existing.owner }
  }

  writeJson(storage, SIGNUP_LOCK_KEY, { owner, acquiredAt: now })

  return { acquired: true, owner }
}

export function releaseSignupLock(owner) {
  const storage = getStorage()

  if (!storage) {
    return
  }

  const existing = readJson(storage, SIGNUP_LOCK_KEY)

  if (!existing || !owner || existing.owner === owner) {
    storage.removeItem(SIGNUP_LOCK_KEY)
  }
}
