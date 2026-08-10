import { supabase } from '@/lib/supabase'
import {
  captureFirstTouchReferral,
  getCurrentPath,
  getFirstTouchReferral,
  getOrCreateTrafficVisitorKey,
} from '@/utils/visitReferral'

let trafficRecordedForKey = ''
let trafficRecordedAsMember = false
let memberVisitInFlight = null
let lastMemberVisitAtMs = 0

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

  // 비회원으로 이미 기록한 뒤 같은 날 로그인하면 회원 플래그 갱신을 위해 1회 더 호출
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

/** 로그인 회원 일별 접속 upsert (first 유지, last 갱신) */
export async function upsertMemberDailyVisit(user) {
  if (!user?.id) {
    return { success: false }
  }

  const now = Date.now()
  if (now - lastMemberVisitAtMs < 30_000 && memberVisitInFlight == null) {
    return { success: true, skipped: true }
  }

  if (memberVisitInFlight) {
    return memberVisitInFlight
  }

  memberVisitInFlight = (async () => {
    const payload = {
      login_provider: detectLoginProviderFromUser(user),
      ...buildReferralPayload(),
    }

    const { error } = await supabase.rpc('upsert_member_daily_visit', {
      p_payload: payload,
    })

    if (error) {
      console.warn('[VisitTracking] member visit failed', error)
      return { success: false, error }
    }

    lastMemberVisitAtMs = Date.now()
    return { success: true }
  })()

  try {
    return await memberVisitInFlight
  } finally {
    memberVisitInFlight = null
  }
}

export async function trackSiteVisitExtensions({ user = null } = {}) {
  captureFirstTouchReferral()
  await recordTrafficEventIfNeeded({ isMember: Boolean(user) })

  if (user) {
    await upsertMemberDailyVisit(user)
  }
}
