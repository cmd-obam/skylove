/**
 * Korea (Asia/Seoul) datetime helpers for scheduled posts.
 */

export function getKoreaDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getKoreaTimeString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00'
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00'
  return `${hour}:${minute}`
}

/** Interpret local Korea date+time as timestamptz ISO string. */
export function koreaDateTimeToIso(dateStr, timeStr) {
  const date = String(dateStr || '').trim()
  const time = String(timeStr || '').trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null
  }

  if (!/^\d{2}:\d{2}$/.test(time)) {
    return null
  }

  const iso = new Date(`${date}T${time}:00+09:00`)
  if (Number.isNaN(iso.getTime())) {
    return null
  }

  return iso.toISOString()
}

export function isoToKoreaDateTimeParts(iso) {
  if (!iso) {
    return { date: '', time: '' }
  }

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return { date: '', time: '' }
  }

  return {
    date: getKoreaDateString(date),
    time: getKoreaTimeString(date),
  }
}

export function formatKoreaScheduleMessage(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return '게시글이 예약 등록되었습니다.'
  }

  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return `게시글이 예약 등록되었습니다.\n${formatter.format(date)}에 게시됩니다.`
}

export function isScheduleInFuture(iso, { minSkewMs = 60_000 } = {}) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return false
  }

  return date.getTime() > Date.now() + minSkewMs
}
