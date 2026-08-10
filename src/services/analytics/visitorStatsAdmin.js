import { supabase } from '@/lib/supabase'
import { getKoreaDateString } from '@/utils/visitorDate'
import {
  getLoginMethodLabel,
  getReferralSourceLabel,
} from '@/utils/visitReferral'

function shiftKoreaDate(baseDateString, dayDelta) {
  const [year, month, day] = baseDateString.split('-').map(Number)
  const utc = Date.UTC(year, month - 1, day) + dayDelta * 24 * 60 * 60 * 1000
  const date = new Date(utc)
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function resolveVisitorStatsRange(period, customFrom = '', customTo = '') {
  const today = getKoreaDateString()

  switch (period) {
    case 'yesterday': {
      const yesterday = shiftKoreaDate(today, -1)
      return { from: yesterday, to: yesterday }
    }
    case '7d':
      return { from: shiftKoreaDate(today, -6), to: today }
    case '30d':
      return { from: shiftKoreaDate(today, -29), to: today }
    case 'custom': {
      const from = customFrom || today
      const to = customTo || today
      return from <= to ? { from, to } : { from: to, to: from }
    }
    case 'today':
    default:
      return { from: today, to: today }
  }
}

function mapSiteVisitRow(row) {
  const isMember = Boolean(row.is_member)
  const loginProvider = isMember ? row.login_provider || 'email' : 'guest'

  return {
    id: row.id,
    visitorKey: row.visitor_key,
    isMember,
    visitorTypeLabel: isMember ? '회원' : '비회원',
    userId: row.user_id || null,
    username: isMember ? row.username || '-' : '-',
    name: isMember ? row.name || '-' : '-',
    visitDate: row.visit_date,
    firstVisitAt: row.first_visit_at,
    lastVisitAt: row.last_visit_at,
    loginProvider,
    loginProviderLabel: getLoginMethodLabel(loginProvider),
    referralSource: row.referral_source || 'unknown',
    referralSourceLabel: getReferralSourceLabel(row.referral_source),
    referralRaw: row.referral_raw || '',
    utmSource: row.utm_source || '',
    utmMedium: row.utm_medium || '',
    utmCampaign: row.utm_campaign || '',
    landingPath: row.landing_path || '',
    lastPath: row.last_path || '',
  }
}

/** 전체 방문 기록 (회원 + 비회원) */
export async function fetchSiteVisitsForAdmin(fromDate, toDate) {
  const { data, error } = await supabase.rpc('list_site_visits_for_super_admin', {
    p_from: fromDate,
    p_to: toDate,
  })

  if (error) {
    return {
      success: false,
      message: error.message || '방문 기록을 불러오지 못했습니다.',
      visits: [],
    }
  }

  return {
    success: true,
    visits: (data ?? []).map(mapSiteVisitRow),
  }
}

/** @deprecated 호환용 — fetchSiteVisitsForAdmin 사용 */
export async function fetchMemberDailyVisitsForAdmin(fromDate, toDate) {
  const result = await fetchSiteVisitsForAdmin(fromDate, toDate)
  if (!result.success) {
    return { ...result, visits: [] }
  }

  return {
    success: true,
    visits: result.visits.filter((visit) => visit.isMember),
  }
}

export async function fetchReferralStatsForAdmin(fromDate, toDate) {
  const { data, error } = await supabase.rpc('list_referral_stats_for_super_admin', {
    p_from: fromDate,
    p_to: toDate,
  })

  if (error) {
    return {
      success: false,
      message: error.message || '유입 경로 통계를 불러오지 못했습니다.',
      stats: [],
    }
  }

  return {
    success: true,
    stats: (data ?? []).map((row) => ({
      source: row.referral_source || 'unknown',
      label: getReferralSourceLabel(row.referral_source),
      totalCount: Number(row.total_count) || 0,
      memberCount: Number(row.member_count) || 0,
      guestCount: Number(row.guest_count) || 0,
    })),
  }
}

export function formatVisitTime(isoString) {
  if (!isoString) return '-'
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(isoString))
  } catch {
    return '-'
  }
}

export function formatVisitDateTime(isoString) {
  if (!isoString) return '-'
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(isoString))
  } catch {
    return '-'
  }
}
