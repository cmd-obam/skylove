const STORAGE_KEY = 'skylove_security_answer_rate_limit'
const MAX_FAILURES = 5
const LOCK_DURATION_MS = 10 * 60 * 1000

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function normalizeKey(identityKey) {
  return String(identityKey ?? '')
    .trim()
    .toLowerCase()
}

/**
 * 보안 답변 연속 실패 제한 (5회 / 10분).
 * identityKey 예: email 또는 username
 */
export function getSecurityAnswerLockStatus(identityKey) {
  const key = normalizeKey(identityKey)

  if (!key) {
    return { locked: false, remainingAttempts: MAX_FAILURES, retryAfterMs: 0 }
  }

  const store = readStore()
  const entry = store[key]

  if (!entry) {
    return { locked: false, remainingAttempts: MAX_FAILURES, retryAfterMs: 0 }
  }

  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    return {
      locked: true,
      remainingAttempts: 0,
      retryAfterMs: entry.lockedUntil - Date.now(),
      message: '답변 입력 횟수를 초과했습니다.\n10분 후 다시 시도해주세요.',
    }
  }

  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    delete store[key]
    writeStore(store)
    return { locked: false, remainingAttempts: MAX_FAILURES, retryAfterMs: 0 }
  }

  const failures = Number(entry.failures) || 0
  return {
    locked: false,
    remainingAttempts: Math.max(0, MAX_FAILURES - failures),
    retryAfterMs: 0,
  }
}

export function recordSecurityAnswerFailure(identityKey) {
  const key = normalizeKey(identityKey)

  if (!key) {
    return getSecurityAnswerLockStatus(identityKey)
  }

  const store = readStore()
  const current = store[key] || { failures: 0 }
  const failures = (Number(current.failures) || 0) + 1

  if (failures >= MAX_FAILURES) {
    store[key] = {
      failures,
      lockedUntil: Date.now() + LOCK_DURATION_MS,
    }
  } else {
    store[key] = {
      failures,
      lockedUntil: null,
    }
  }

  writeStore(store)
  return getSecurityAnswerLockStatus(key)
}

export function clearSecurityAnswerFailures(identityKey) {
  const key = normalizeKey(identityKey)

  if (!key) {
    return
  }

  const store = readStore()
  if (store[key]) {
    delete store[key]
    writeStore(store)
  }
}

export const SECURITY_ANSWER_MAX_FAILURES = MAX_FAILURES
export const SECURITY_ANSWER_LOCK_MINUTES = 10
