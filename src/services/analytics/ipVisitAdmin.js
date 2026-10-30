import { supabase } from '@/lib/supabase'

function missingFunction(error) {
  const message = String(error?.message || '')
  return error?.code === 'PGRST202' || message.includes('Could not find the function')
}

function mapError(error, fallback) {
  if (missingFunction(error)) {
    return 'IP 방문 기록 SQL이 아직 적용되지 않았습니다. Supabase SQL Editor에서 supabase/apply_site_ip_visits.sql을 실행해주세요.'
  }

  if (error?.message === '로그인이 필요합니다.' || error?.message === '접근 권한이 없습니다.') {
    return error.message
  }

  return error?.message || fallback
}

function rowsOf(data) {
  return Array.isArray(data) ? data : []
}

export async function fetchIpVisitRecorderStatus() {
  try {
    const response = await fetch('/api/record-ip-visit', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    const body = await response.json().catch(() => null)

    if (!response.ok || !body || typeof body !== 'object') {
      return {
        success: false,
        ready: false,
        reason: 'status_unavailable',
        message: 'IP 방문 기록 서버 상태를 확인하지 못했습니다.',
      }
    }

    if (body.ready) {
      return { success: true, ready: true, reason: null, message: '' }
    }

    const missing = Array.isArray(body.missing) ? body.missing.filter(Boolean) : []
    if (body.reason === 'server_key_missing' || missing.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return {
        success: true,
        ready: false,
        reason: 'server_key_missing',
        message:
          'IP 방문이 저장되지 않습니다. Vercel 프로젝트 Environment Variables에 서버 전용 SUPABASE_SERVICE_ROLE_KEY를 넣고 재배포해주세요. VITE_ 접두사는 사용하지 마세요.',
      }
    }

    return {
      success: true,
      ready: false,
      reason: body.reason || 'not_ready',
      message: 'IP 방문 기록 서버 설정이 아직 준비되지 않았습니다.',
    }
  } catch {
    return {
      success: false,
      ready: false,
      reason: 'network',
      message: 'IP 방문 기록 서버에 연결하지 못했습니다.',
    }
  }
}

export async function fetchIpVisitOverview() {
  const { data, error } = await supabase.rpc('get_ip_visit_overview_for_super_admin')

  if (error) {
    return { success: false, message: mapError(error, 'IP 방문 요약을 불러오지 못했습니다.'), overview: null }
  }

  const row = Array.isArray(data) ? data[0] : data
  return { success: true, overview: row ?? null }
}

export async function fetchIpVisitList({
  from,
  to,
  search = '',
  audience = 'all',
  sort = 'total',
  limit = 20,
  offset = 0,
}) {
  const { data, error } = await supabase.rpc('list_ip_visits_for_super_admin', {
    p_from: from,
    p_to: to,
    p_search: search,
    p_audience: audience,
    p_sort: sort,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) {
    return { success: false, message: mapError(error, 'IP 목록을 불러오지 못했습니다.'), rows: [], total: 0 }
  }

  const rows = rowsOf(data)
  return {
    success: true,
    rows,
    total: Number(rows[0]?.total_matching || 0),
  }
}

export async function fetchIpVisitDetail({ ip, from, to, limit = 50, offset = 0 }) {
  const { data, error } = await supabase.rpc('get_ip_visit_detail_for_super_admin', {
    p_ip: ip,
    p_from: from,
    p_to: to,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) {
    return { success: false, message: mapError(error, 'IP 상세 기록을 불러오지 못했습니다.'), detail: null }
  }

  return { success: true, detail: data && typeof data === 'object' ? data : null }
}

export async function updateIpVisitRetention(days) {
  const { data, error } = await supabase.rpc('update_ip_visit_retention_for_super_admin', {
    p_days: days,
  })

  if (error) {
    return { success: false, message: mapError(error, '보관 기간을 저장하지 못했습니다.') }
  }

  return { success: true, days: Number(data) }
}
