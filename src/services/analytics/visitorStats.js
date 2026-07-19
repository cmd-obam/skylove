import { supabase } from '@/lib/supabase'
import {
  formatVisitorCount,
  getKoreaDateString,
  getVisitorStorageKey,
} from '@/utils/visitorDate'

export { formatVisitorCount, getKoreaDateString, getVisitorStorageKey }

/** Module-level guards: avoid duplicate UPDATE on StrictMode / remounts */
let inFlightPromise = null
let memoryCache = null

function hasRecordedVisitToday() {
  if (typeof window === 'undefined') {
    return true
  }

  try {
    return window.localStorage.getItem(getVisitorStorageKey()) === '1'
  } catch {
    return true
  }
}

function markVisitRecordedToday() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(getVisitorStorageKey(), '1')
  } catch {
    // Ignore quota / private-mode failures; memoryCache still dedupes this session.
  }
}

function normalizeStatsRow(row) {
  if (!row) {
    return { todayCount: 0, totalCount: 0 }
  }

  const today = Number(row.today_count ?? row.todayCount ?? 0)
  const total = Number(row.total_count ?? row.totalCount ?? 0)

  return {
    todayCount: Number.isFinite(today) ? today : 0,
    totalCount: Number.isFinite(total) ? total : 0,
  }
}

function unwrapRpcRows(data) {
  if (Array.isArray(data)) {
    return normalizeStatsRow(data[0])
  }

  return normalizeStatsRow(data)
}

/** Footer / public UI: SELECT-only path */
export async function fetchVisitorStats() {
  const { data, error } = await supabase.rpc('get_site_visitor_stats')

  if (error) {
    const { data: tableData, error: tableError } = await supabase
      .from('site_visitor_stats')
      .select('today_count, total_count, stat_date')
      .eq('id', 1)
      .maybeSingle()

    if (tableError) {
      console.warn('[VisitorStats] fetch failed', error, tableError)
      return { todayCount: 0, totalCount: 0, error: tableError }
    }

    const today = getKoreaDateString()
    if (tableData?.stat_date && tableData.stat_date !== today) {
      return { todayCount: 0, totalCount: Number(tableData.total_count) || 0 }
    }

    return normalizeStatsRow(tableData)
  }

  return unwrapRpcRows(data)
}

/** First visit of the day only: UPDATE via SECURITY DEFINER RPC */
export async function recordVisitorIfNeeded() {
  if (hasRecordedVisitToday()) {
    return { recorded: false }
  }

  const { data, error } = await supabase.rpc('record_site_visit')

  if (error) {
    console.warn('[VisitorStats] record failed', error)
    return { recorded: false, error }
  }

  markVisitRecordedToday()
  return { recorded: true, stats: unwrapRpcRows(data) }
}

/**
 * One-shot loader for Footer:
 * - first browser visit of the day → record_site_visit (UPDATE)
 * - otherwise → get_site_visitor_stats (SELECT)
 * Dedupes concurrent calls with an in-flight promise.
 */
export async function loadVisitorStats() {
  if (memoryCache) {
    return memoryCache
  }

  if (inFlightPromise) {
    return inFlightPromise
  }

  inFlightPromise = (async () => {
    try {
      const alreadyCounted = hasRecordedVisitToday()

      if (!alreadyCounted) {
        const result = await recordVisitorIfNeeded()
        if (result.stats) {
          memoryCache = result.stats
          return memoryCache
        }
      }

      const stats = await fetchVisitorStats()
      memoryCache = {
        todayCount: stats.todayCount,
        totalCount: stats.totalCount,
      }
      return memoryCache
    } catch (error) {
      memoryCache = null
      throw error
    }
  })()

  try {
    return await inFlightPromise
  } finally {
    inFlightPromise = null
  }
}

/** Test helper — reset module cache between tests */
export function __resetVisitorStatsCacheForTests() {
  memoryCache = null
  inFlightPromise = null
}
