import { supabase } from '@/lib/supabase'
import {
  captureFirstTouchReferral,
  getCurrentPath,
  getFirstTouchReferral,
  getOrCreateTrafficVisitorKey,
} from '@/utils/visitReferral'

/** dayKey → last successful touch ms */
const lastTrafficTouchAtByDayKey = new Map()
/** dayKey → in-flight promise */
const trafficInFlightByDayKey = new Map()

let trafficRecordedAsMemberByDayKey = new Set()

const TRAFFIC_TOUCH_MIN_INTERVAL_MS = 20_000

function detectLoginProviderFromUser(user) {
  const metaProvider = String(user?.app_metadata?.provider || '').toLowerCase()
  if (metaProvider && metaProvider !== 'email') {
    return metaProvider
  }

  const identities = Array.isArray(user?.identities) ? user.identities : []
  const oauth = identities.find((item) => {
    const provider = String(item?.provider || '').toLowerCase()
    return provider && provider !== 'email'
  })

  if (oauth?.provider) {
    return String(oauth.provider).toLowerCase()
  }

  return 'email'
}

function buildReferralPayload(extra = {}) {
  const touch = getFirstTouchReferral() || captureFirstTouchReferral() || {}
  return {
    referral_source: touch.referral_source || 'unknown',
    referral_raw: touch.referral_raw || '',
    utm_source: touch.utm_source || '',
    utm_medium: touch.utm_medium || '',
    utm_campaign: touch.utm_campaign || '',
    utm_content: touch.utm_content || '',
    utm_term: touch.utm_term || '',
    landing_path: touch.landing_path || getCurrentPath(),
    last_path: getCurrentPath(),
    ...extra,
  }
}

/** React state 대신 Supabase 세션을 직접 읽어 누락을 줄입니다. */
export async function resolveAuthenticatedUser(preferredUser = null) {
  if (preferredUser?.id) {
    return preferredUser
  }

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.warn('[VisitTracking] getSession failed', error)
      return null
    }

    return session?.user ?? null
  } catch (error) {
    console.warn('[VisitTracking] getSession threw', error)
    return null
  }
}

function getKoreaDayString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

/**
 * 전체 방문 기록 upsert (회원/비회원 공통, visitor_key + 날짜 1건)
 * - 비회원 방문 후 로그인 시 동일 행을 회원으로 승격
 * - TODAY/TOTAL(record_site_visit)은 호출하지 않음
 */
export async function recordTrafficEventIfNeeded({ user = null } = {}) {
  if (typeof window === 'undefined') {
    return { recorded: false }
  }

  const visitorKey = getOrCreateTrafficVisitorKey()
  if (!visitorKey) {
    return { recorded: false }
  }

  const authUser = user
  const isMember = Boolean(authUser?.id)
  const dayKey = `${visitorKey}_${getKoreaDayString()}`
  const shouldUpgradeToMember = isMember && !trafficRecordedAsMemberByDayKey.has(dayKey)
  const lastTouch = lastTrafficTouchAtByDayKey.get(dayKey) || 0
  const recentlyTouched = Date.now() - lastTouch < TRAFFIC_TOUCH_MIN_INTERVAL_MS

  let sessionMarked = false
  try {
    sessionMarked = window.sessionStorage.getItem(`traffic_${dayKey}`) === '1'
  } catch {
    // ignore
  }

  // 이미 오늘 기록했고, 회원 승격도 아니고, 최근에 갱신했으면 스킵
  if (sessionMarked && !shouldUpgradeToMember && recentlyTouched) {
    return { recorded: false, skipped: true }
  }

  const existing = trafficInFlightByDayKey.get(dayKey)
  if (existing) {
    return existing
  }

  const task = (async () => {
    const payload = {
      visitor_key: visitorKey,
      login_provider: isMember ? detectLoginProviderFromUser(authUser) : 'guest',
      ...buildReferralPayload(),
    }

    const { error } = await supabase.rpc('record_site_traffic_event', {
      p_payload: payload,
    })

    if (error) {
      console.warn('[VisitTracking] traffic event failed', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        isMember,
      })
      return { recorded: false, error }
    }

    lastTrafficTouchAtByDayKey.set(dayKey, Date.now())
    if (isMember) {
      trafficRecordedAsMemberByDayKey.add(dayKey)
    }

    try {
      window.sessionStorage.setItem(`traffic_${dayKey}`, '1')
    } catch {
      // ignore
    }

    return { recorded: true, isMember }
  })()

  trafficInFlightByDayKey.set(dayKey, task)

  try {
    return await task
  } finally {
    trafficInFlightByDayKey.delete(dayKey)
  }
}

/**
 * 기존 TODAY/TOTAL(record_site_visit)과 무관하게
 * 전체 방문 기록(회원/비회원)만 site_traffic_events 에 기록합니다.
 */
export async function trackSiteVisitExtensions({ user = null } = {}) {
  captureFirstTouchReferral()

  const authUser = await resolveAuthenticatedUser(user)
  await recordTrafficEventIfNeeded({ user: authUser })

  return { userId: authUser?.id ?? null, isMember: Boolean(authUser) }
}
