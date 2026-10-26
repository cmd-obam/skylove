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
