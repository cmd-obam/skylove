/**
 * 개인정보(이메일·휴대폰) 표시용 마스킹 유틸.
 * 인증 관련 비밀값(비밀번호, 토큰 등)은 다루지 않는다.
 */

export const PII_REVEAL_DURATION_MS = 8000

export const PII_FIELD = {
  EMAIL: 'email',
  PHONE: 'phone',
}

export function getPiiFieldLabel(field) {
  if (field === PII_FIELD.EMAIL) {
    return '이메일'
  }

  if (field === PII_FIELD.PHONE) {
    return '휴대폰'
  }

  return field
}

/** rim6830@naver.com → rim****@naver.com */
export function maskEmail(email) {
  if (email == null || String(email).trim() === '') {
    return '-'
  }

  const value = String(email).trim()
  const atIndex = value.indexOf('@')

  if (atIndex <= 0) {
    if (value.length <= 2) {
      return `${value[0] ?? ''}*`
    }

    return `${value.slice(0, 2)}${'*'.repeat(Math.min(4, value.length - 2))}`
  }

  const local = value.slice(0, atIndex)
  const domain = value.slice(atIndex + 1)
  const visible = Math.min(3, Math.max(1, local.length - 1))
  const maskedLocal = `${local.slice(0, visible)}${'*'.repeat(Math.max(4, local.length - visible))}`

  return `${maskedLocal}@${domain}`
}

/**
 * 010-1234-5678 / 01012345678 → 010-****-5678
 * 그 외 형식은 중간을 * 처리
 */
export function maskPhone(phone) {
  if (phone == null || String(phone).trim() === '') {
    return '-'
  }

  const raw = String(phone).trim()
  const digits = raw.replace(/\D/g, '')

  if (digits.length === 11 && digits.startsWith('010')) {
    return `010-****-${digits.slice(7)}`
  }

  if (digits.length === 10 && digits.startsWith('01')) {
    return `${digits.slice(0, 3)}-****-${digits.slice(6)}`
  }

  if (digits.length >= 8) {
    const head = digits.slice(0, 3)
    const tail = digits.slice(-4)
    return `${head}-****-${tail}`
  }

  if (raw.length <= 4) {
    return '*'.repeat(raw.length)
  }

  return `${raw.slice(0, 2)}${'*'.repeat(raw.length - 4)}${raw.slice(-2)}`
}

export function maskPiiValue(field, value) {
  if (field === PII_FIELD.EMAIL) {
    return maskEmail(value)
  }

  if (field === PII_FIELD.PHONE) {
    return maskPhone(value)
  }

  return value == null || value === '' ? '-' : String(value)
}
