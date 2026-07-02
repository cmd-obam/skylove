const STORAGE_KEY = 'skylove_password_reset'
const TTL_MS = 10 * 60 * 1000

function readPasswordResetSessionRaw() {
  const raw = sessionStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)

    if (!parsed?.email || !parsed?.name || !parsed?.expiresAt) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }

    if (Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }

    return parsed
  } catch {
    sessionStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function writePasswordResetSession(session) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function setPasswordResetSession({ email, name }) {
  writePasswordResetSession({
    email: String(email ?? '').trim(),
    name: String(name ?? '').trim(),
    securityVerified: false,
    securityAnswer: '',
    expiresAt: Date.now() + TTL_MS,
  })
}

export function setPasswordResetSecurityVerified(securityAnswer) {
  const session = readPasswordResetSessionRaw()

  if (!session) {
    return false
  }

  writePasswordResetSession({
    ...session,
    securityVerified: true,
    securityAnswer: String(securityAnswer ?? '').trim(),
  })

  return true
}

export function getPasswordResetSession() {
  const parsed = readPasswordResetSessionRaw()

  if (!parsed) {
    return null
  }

  return {
    email: parsed.email,
    name: parsed.name,
    securityVerified: Boolean(parsed.securityVerified),
    securityAnswer: parsed.securityAnswer ?? '',
  }
}

export function clearPasswordResetSession() {
  sessionStorage.removeItem(STORAGE_KEY)
}
