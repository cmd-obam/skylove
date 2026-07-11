import {
  DEFAULT_SIGNUP_EMAIL_DOMAIN,
  SIGNUP_EMAIL_DOMAIN_CUSTOM,
  SIGNUP_EMAIL_DOMAIN_VALUES,
} from '@/data/signupEmailDomains'

export function sanitizeEmailLocalPart(value) {
  return String(value ?? '')
    .replace(/@/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 64)
}

export function sanitizeEmailDomainPart(value) {
  return String(value ?? '')
    .replace(/@/g, '')
    .replace(/[^a-zA-Z0-9.-]/g, '')
    .slice(0, 128)
    .toLowerCase()
}

export function splitSignupEmail(email) {
  const trimmed = String(email ?? '').trim()
  const atIndex = trimmed.indexOf('@')

  if (atIndex <= 0) {
    return {
      local: sanitizeEmailLocalPart(atIndex === 0 ? trimmed.slice(1) : trimmed),
      domain: DEFAULT_SIGNUP_EMAIL_DOMAIN,
      customDomain: '',
    }
  }

  const local = sanitizeEmailLocalPart(trimmed.slice(0, atIndex))
  const domainPart = sanitizeEmailDomainPart(trimmed.slice(atIndex + 1))

  if (!domainPart) {
    return {
      local,
      domain: DEFAULT_SIGNUP_EMAIL_DOMAIN,
      customDomain: '',
    }
  }

  if (SIGNUP_EMAIL_DOMAIN_VALUES.has(domainPart)) {
    return {
      local,
      domain: domainPart,
      customDomain: '',
    }
  }

  return {
    local,
    domain: SIGNUP_EMAIL_DOMAIN_CUSTOM,
    customDomain: domainPart,
  }
}

export function buildSignupEmail(local, domain, customDomain = '') {
  const sanitizedLocal = sanitizeEmailLocalPart(local)

  if (!sanitizedLocal) {
    return ''
  }

  const resolvedDomain =
    domain === SIGNUP_EMAIL_DOMAIN_CUSTOM
      ? sanitizeEmailDomainPart(customDomain)
      : sanitizeEmailDomainPart(domain)

  if (!resolvedDomain) {
    return ''
  }

  return `${sanitizedLocal}@${resolvedDomain}`
}

export function resolveSignupEmailDomain(domain, customDomain = '') {
  if (domain === SIGNUP_EMAIL_DOMAIN_CUSTOM) {
    return sanitizeEmailDomainPart(customDomain)
  }

  return sanitizeEmailDomainPart(domain)
}
