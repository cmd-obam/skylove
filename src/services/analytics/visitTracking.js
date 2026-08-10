import { supabase } from '@/lib/supabase'
import {
  captureFirstTouchReferral,
  getCurrentPath,
  getFirstTouchReferral,
  getOrCreateTrafficVisitorKey,
} from '@/utils/visitReferral'

/** userId → last successful upsert ms (동일 회원 과도한 갱신 방지) */
const lastMemberVisitAtByUser = new Map()
/** userId → in-flight promise */
const memberVisitInFlightByUser = new Map()

let trafficRecordedForKey = ''
let trafficRecordedAsMember = false

const MEMBER_VISIT_MIN_INTERVAL_MS = 20_000

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

/** 익명 포함 유입 이벤트 (visitor_key + 날짜 1회, 로그인 시 회원 플래그 업그레이드) */
export async function recordTrafficEventIfNeeded({ isMember = false } = {}) {
  if (typeof window === 'undefined') {
    return { recorded: false }
  }

  const visitorKey = getOrCreateTrafficVisitorKey()
  if (!visitorKey) {
    return { recorded: false }
  }

  const dayKey = `${visitorKey}_${new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })}`
  const alreadyRecorded = trafficRecordedForKey === dayKey
  let sessionMarked = false

  try {
    sessionMarked = window.sessionStorage.getItem(`traffic_${dayKey}`) === '1'
  } catch {
    // ignore
  }

  if ((alreadyRecorded || sessionMarked) && (!isMember || trafficRecordedAsMember)) {
    trafficRecordedForKey = dayKey
    return { recorded: false }
  }

  const payload = {
    visitor_key: visitorKey,
    ...buildReferralPayload(),
  }

  const { error } = await supabase.rpc('record_site_traffic_event', {
    p_payload: payload,
  })

  if (error) {
    console.warn('[VisitTracking] traffic event failed', error)
    return { recorded: false, error }
  }

  trafficRecordedForKey = dayKey
  if (isMember) {
    trafficRecordedAsMember = true
  }

  try {
    window.sessionStorage.setItem(`traffic_${dayKey}`, '1')
  } catch {
    // ignore
  }

  return { recorded: true }
}

/** 로그인 회원 일별 접속 upsert (first 유지, last 갱신) — 회원별로 독립 */
export async function upsertMemberDailyVisit(user) {
  const authUser = await resolveAuthenticatedUser(user)
  if (!authUser?.id) {
    return { success: false, reason: 'no_user' }
  }

  const userId = authUser.id
  const now = Date.now()
  const lastAt = lastMemberVisitAtByUser.get(userId) || 0

  if (now - lastAt < MEMBER_VISIT_MIN_INTERVAL_MS && !memberVisitInFlightByUser.has(userId)) {
    return { success: true, skipped: true }
  }

  const existing = memberVisitInFlightByUser.get(userId)
  if (existing) {
    return existing
  }

  const task = (async () => {
    const payload = {
      login_provider: detectLoginProviderFromUser(authUser),
      ...buildReferralPayload(),
    }

    const { error } = await supabase.rpc('upsert_member_daily_visit', {
      p_payload: payload,
    })

    if (error) {
      console.warn('[VisitTracking] member visit failed', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId,
      })
      return { success: false, error }
    }

    lastMemberVisitAtByUser.set(userId, Date.now())
    return { success: true }
  })()

  memberVisitInFlightByUser.set(userId, task)

  try {
    return await task
  } finally {
    memberVisitInFlightByUser.delete(userId)
  }
}

/**
 * 기존 TODAY/TOTAL(record_site_visit)과 무관하게
 * 유입 이벤트 + (로그인 시) 회원 일별 접속만 기록합니다.
 */
export async function trackSiteVisitExtensions({ user = null } = {}) {
  captureFirstTouchReferral()

  const authUser = await resolveAuthenticatedUser(user)
  await recordTrafficEventIfNeeded({ isMember: Boolean(authUser) })

  if (authUser) {
    await upsertMemberDailyVisit(authUser)
  }

  return { userId: authUser?.id ?? null }
}
