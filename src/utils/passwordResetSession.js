const STORAGE_KEY = 'skylove_password_reset'
const TTL_MS = 10 * 60 * 1000

export function setPasswordResetSession({ email, name }) {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      email: String(email ?? '').trim(),
      name: String(name ?? '').trim(),
      expiresAt: Date.now() + TTL_MS,
    }),
  )
}

export function getPasswordResetSession() {
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

    return {
      email: parsed.email,
      name: parsed.name,
    }
  } catch {
    sessionStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function clearPasswordResetSession() {
  sessionStorage.removeItem(STORAGE_KEY)
}
