const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/

function headerValue(headers, name) {
  if (!headers) return ''
  const direct = headers[name] ?? headers[name.toLowerCase()]
  if (Array.isArray(direct)) return String(direct[0] ?? '').trim()
  if (typeof headers.get === 'function') {
    return String(headers.get(name) ?? '').trim()
  }
  return String(direct ?? '').trim()
}

function firstAddress(value) {
  return String(value || '')
    .split(',')[0]
    .trim()
    .replace(/^"|"$/g, '')
}

export function normalizeTrustedIp(value) {
  let ip = firstAddress(value)
  if (!ip || ip.length > 64) return null

  const withPort = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/)
  if (withPort) ip = withPort[1]

  const bracket = ip.match(/^\[([0-9a-f:]+)\](?::\d+)?$/i)
  if (bracket) ip = bracket[1]

  const lower = ip.toLowerCase()
  if (
    lower === 'unknown' ||
    lower === '0.0.0.0' ||
    lower === '::' ||
    lower === '::1' ||
    lower.startsWith('127.')
  ) {
    return null
  }

  if (IPV4.test(ip)) return ip

  if (/^[0-9a-f:]+$/i.test(ip) && ip.includes(':') && ip.length <= 45) {
    return lower
  }

  return null
}

/**
 * Vercel overwrites x-real-ip and x-forwarded-for so a browser cannot spoof them.
 * x-real-ip is the address Vercel's own helper uses.
 * A value sent in the JSON body is never read.
 */
export function resolveTrustedClientIp(headers) {
  const realIp = normalizeTrustedIp(headerValue(headers, 'x-real-ip'))
  if (realIp) return realIp

  return normalizeTrustedIp(headerValue(headers, 'x-vercel-forwarded-for'))
}

export function sanitizeVisitPath(value) {
  const raw = String(value ?? '').trim()
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) {
    return '/'
  }

  const path = raw.split('?')[0].split('#')[0].slice(0, 300)
  return path || '/'
}

export function sanitizeReferral(value, maxLength = 300) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f]/g, '')
    .trim()
    .slice(0, maxLength)
}

export function buildTrustedVisitPayload(headers, body) {
  const source = body && typeof body === 'object' ? body : {}
  return {
    ip: resolveTrustedClientIp(headers),
    path: sanitizeVisitPath(source.path),
    referralSource: sanitizeReferral(source.referral_source, 80),
    referralRaw: sanitizeReferral(source.referral_raw, 300),
  }
}
