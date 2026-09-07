import { supabase } from '@/lib/supabase'
import { getKoreaDateString } from '@/utils/visitorDate'
import { resolveVisitorStatsRange } from '@/services/analytics/visitorStatsAdmin'

const EMPTY_DASHBOARD = {
  summary: {
    visitors: 0,
    sessions: 0,
    pageviews: 0,
    avg_session_ms: 0,
    median_session_ms: 0,
    new_visitors: 0,
    returning_visitors: 0,
  },
  cumulative: {
    visitors: 0,
    sessions: 0,
    pageviews: 0,
  },
  daily: [],
  referrers: [],
  pages: [],
  worship: [],
  duration_buckets: [],
  hourly: [],
  weekday: [],
  devices: [],
  browsers: [],
  os: [],
  viewports: [],
  landings: [],
  exits: [],
  scroll: { d25: 0, d50: 0, d75: 0, d90: 0, d100: 0, total: 0 },
  cta: [],
  external_links: [],
  visit_freq: [],
}

export function resolveAnalyticsRange(period, customFrom = '', customTo = '') {
  if (period === '90d') {
    const today = getKoreaDateString()
    const [year, month, day] = today.split('-').map(Number)
    const utc = Date.UTC(year, month - 1, day) - 89 * 24 * 60 * 60 * 1000
    const date = new Date(utc)
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const d = String(date.getUTCDate()).padStart(2, '0')
    return { from: `${y}-${m}-${d}`, to: today }
  }

  return resolveVisitorStatsRange(period, customFrom, customTo)
}

export function formatDurationMs(ms) {
  const value = Number(ms) || 0
  if (value <= 0) return '0초'
  const totalSec = Math.round(value / 1000)
  if (totalSec < 60) return `${totalSec}초`
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min < 60) return sec ? `${min}분 ${sec}초` : `${min}분`
  const hour = Math.floor(min / 60)
  const remMin = min % 60
  return remMin ? `${hour}시간 ${remMin}분` : `${hour}시간`
}

export function getWeekdayLabel(dow) {
  const labels = ['일', '월', '화', '수', '목', '금', '토']
  return labels[Number(dow)] || String(dow)
}

export function getHourBucketLabel(hourStart) {
  const start = Number(hourStart) || 0
  const end = start + 3
  return `${String(start).padStart(2, '0')}~${String(end).padStart(2, '0')}`
}

export function getReferralAnalyticsLabel(source) {
  const map = {
    naver: '네이버',
    google: '구글',
    daum: '다음',
    bing: '빙',
    youtube: '유튜브',
    kakaotalk: '카카오',
    instagram: '인스타그램',
    facebook: '페이스북',
    direct: '직접 방문',
    unknown: '기타',
    other: '외부 사이트',
  }
  return map[String(source || '').toLowerCase()] || source || '기타'
}

export async function fetchSiteAnalyticsDashboard(fromDate, toDate) {
  const { data, error } = await supabase.rpc('get_site_analytics_dashboard', {
    p_from: fromDate,
    p_to: toDate,
  })

  if (error) {
    return {
      success: false,
      message: error.message || '상세 통계를 불러오지 못했습니다.',
      dashboard: EMPTY_DASHBOARD,
    }
  }

  return {
    success: true,
    dashboard: {
      ...EMPTY_DASHBOARD,
      ...(data || {}),
      summary: { ...EMPTY_DASHBOARD.summary, ...(data?.summary || {}) },
      cumulative: { ...EMPTY_DASHBOARD.cumulative, ...(data?.cumulative || {}) },
      scroll: { ...EMPTY_DASHBOARD.scroll, ...(data?.scroll || {}) },
    },
  }
}
