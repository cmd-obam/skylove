/**
 * Asia/Seoul calendar date as YYYY-MM-DD.
 * Kept separate from Supabase client so helpers stay testable.
 */
export function getKoreaDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getVisitorStorageKey(dateString = getKoreaDateString()) {
  return `visitor_${dateString}`
}

export function formatVisitorCount(value) {
  const num = Number(value) || 0
  return num.toLocaleString('en-US')
}
