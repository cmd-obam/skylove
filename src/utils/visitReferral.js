const FIRST_TOUCH_KEY = 'skylove_first_touch_v1'
const VISITOR_KEY = 'skylove_traffic_visitor_key_v1'

const SOURCE_HOST_MAP = [
  { source: 'naver', hosts: ['naver.com', 'naver.co.kr'] },
  { source: 'google', hosts: ['google.', 'googleusercontent.com'] },
  { source: 'daum', hosts: ['daum.net', 'kakao.com/daum'] },
  { source: 'kakaotalk', hosts: ['kakao.com', 'kakao.co.kr'] },
  { source: 'instagram', hosts: ['instagram.com'] },
  { source: 'facebook', hosts: ['facebook.com', 'fb.com', 'm.facebook.com'] },
]

export const REFERRAL_SOURCE_LABELS = {
  naver: '네이버',
  google: '구글',
  daum: '다음',
  kakaotalk: '카카오톡',
  instagram: '인스타그램',
  facebook: '페이스북',
  direct: '직접 접속',
  unknown: '알 수 없음',
  other: '기타',
}

export function getReferralSourceLabel(source) {
  const key = String(source || 'unknown').toLowerCase()
  return REFERRAL_SOURCE_LABELS[key] || REFERRAL_SOURCE_LABELS.other
}

export function getLoginMethodLabel(provider) {
  const key = String(provider || 'guest').toLowerCase()
  if (key === 'guest' || key === 'anonymous' || key === 'none') return '비로그인'
  if (key === 'email') return '일반 로그인'
  if (key === 'kakao') return '카카오 로그인'
  return key
}

function readStorage(storage, key) {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(storage, key, value) {
  try {
    storage.setItem(key, value)
  } catch {
    // ignore private mode / quota
  }
}

function classifyHost(hostname) {
  const host = String(hostname || '').toLowerCase()
  if (!host) return null

  for (const entry of SOURCE_HOST_MAP) {
    if (entry.hosts.some((part) => host.includes(part.replace(/^\./, '')))) {
      // kakao.com includes many products; treat talk-ish paths later
      if (entry.source === 'kakaotalk' && host.includes('daum')) {
        return 'daum'
      }
      return entry.source
    }
  }

  return 'other'
}

function parseUtm(search) {
  const params = new URLSearchParams(search || '')
  return {
    utm_source: params.get('utm_source')?.trim() || '',
    utm_medium: params.get('utm_medium')?.trim() || '',
    utm_campaign: params.get('utm_campaign')?.trim() || '',
    utm_content: params.get('utm_content')?.trim() || '',
    utm_term: params.get('utm_term')?.trim() || '',
  }
}

function classifyReferral({ referrer, utm }) {
  const utmSource = String(utm.utm_source || '').toLowerCase()
  if (utmSource) {
    if (utmSource.includes('naver')) return 'naver'
    if (utmSource.includes('google')) return 'google'
    if (utmSource.includes('daum')) return 'daum'
    if (utmSource.includes('kakao')) return 'kakaotalk'
    if (utmSource.includes('instagram') || utmSource === 'ig') return 'instagram'
    if (utmSource.includes('facebook') || utmSource === 'fb') return 'facebook'
    return 'other'
  }

  if (!referrer) {
    return 'direct'
  }

  try {
    const url = new URL(referrer)
    if (typeof window !== 'undefined' && url.hostname === window.location.hostname) {
      return 'direct'
    }
    return classifyHost(url.hostname) || 'other'
  } catch {
    return 'unknown'
  }
}

export function getOrCreateTrafficVisitorKey() {
  if (typeof window === 'undefined') {
    return ''
  }

  const existing = readStorage(window.localStorage, VISITOR_KEY)
  if (existing && existing.length >= 8) {
    return existing
  }

  const created =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `vk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

  writeStorage(window.localStorage, VISITOR_KEY, created)
  return created
}

/**
 * 최초 유입(first-touch)을 sessionStorage에 보존합니다.
 * 내부 페이지 이동·로그인 후에도 최초 referrer/UTM을 유지합니다.
 */
export function captureFirstTouchReferral() {
  if (typeof window === 'undefined') {
    return null
  }

  const existingRaw = readStorage(window.sessionStorage, FIRST_TOUCH_KEY)
  if (existingRaw) {
    try {
      return JSON.parse(existingRaw)
    } catch {
      // fall through and recapture
    }
  }

  const referrer = String(document.referrer || '').trim()
  const utm = parseUtm(window.location.search)
  const referral_source = classifyReferral({ referrer, utm })
  const landing_path = `${window.location.pathname}${window.location.search || ''}`

  const payload = {
    referral_source,
    referral_raw: referrer.slice(0, 500),
    ...utm,
    landing_path: landing_path.slice(0, 300),
    captured_at: new Date().toISOString(),
  }

  writeStorage(window.sessionStorage, FIRST_TOUCH_KEY, JSON.stringify(payload))
  return payload
}

export function getFirstTouchReferral() {
  if (typeof window === 'undefined') {
    return null
  }

  const existingRaw = readStorage(window.sessionStorage, FIRST_TOUCH_KEY)
  if (!existingRaw) {
    return captureFirstTouchReferral()
  }

  try {
    return JSON.parse(existingRaw)
  } catch {
    return captureFirstTouchReferral()
  }
}

export function getCurrentPath() {
  if (typeof window === 'undefined') {
    return ''
  }

  return `${window.location.pathname}${window.location.search || ''}`.slice(0, 300)
}
