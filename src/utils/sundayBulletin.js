import { SUNDAY_BULLETIN_FIXED } from '@/data/sundayBulletinFixed'

export const SUNDAY_BULLETIN_TYPE = 'sunday_bulletin'
export const SUNDAY_BULLETIN_VERSION = 1

export const EMPTY_SUNDAY_BULLETIN_WEEKLY = {
  seasonWeek: '',
  prayer: '',
  praise: '',
  responsiveReading: '',
  graceSong: '',
  scripture: '',
  sermon: '',
  closingPraise: '',
  churchNews: '',
}

export function createEmptySundayBulletinWeekly(overrides = {}) {
  return {
    ...EMPTY_SUNDAY_BULLETIN_WEEKLY,
    ...overrides,
  }
}

export function isSundayBulletinContent(content) {
  if (!content || typeof content !== 'string') {
    return false
  }

  const trimmed = content.trim()
  if (!trimmed.startsWith('{')) {
    return false
  }

  try {
    const parsed = JSON.parse(trimmed)
    return parsed?.__type === SUNDAY_BULLETIN_TYPE
  } catch {
    return false
  }
}

/** 주차 숫자만 추출 (예: "14", "성령강림절 후 제 14 주" → "14") */
export function extractSeasonWeekNumber(seasonWeek) {
  const text = String(seasonWeek ?? '').trim()
  if (!text) {
    return ''
  }

  if (/^\d+$/.test(text)) {
    return text
  }

  const weekMatch = text.match(/제\s*(\d+)\s*주/)
  if (weekMatch?.[1]) {
    return weekMatch[1]
  }

  const digits = text.match(/(\d+)/)
  return digits?.[1] ?? ''
}

export function parseSundayBulletinWeekly(content) {
  if (!isSundayBulletinContent(content)) {
    return null
  }

  try {
    const parsed = JSON.parse(content.trim())
    return createEmptySundayBulletinWeekly({
      seasonWeek: extractSeasonWeekNumber(parsed.seasonWeek ?? ''),
      prayer: parsed.prayer ?? '',
      praise: parsed.praise ?? '',
      responsiveReading: parsed.responsiveReading ?? '',
      graceSong: parsed.graceSong ?? '',
      scripture: parsed.scripture ?? '',
      sermon: parsed.sermon ?? '',
      closingPraise: parsed.closingPraise ?? '',
      churchNews: parsed.churchNews ?? '',
    })
  } catch {
    return null
  }
}

export function serializeSundayBulletinWeekly(weekly) {
  const data = createEmptySundayBulletinWeekly(weekly)
  const weekNumber = extractSeasonWeekNumber(data.seasonWeek)

  return JSON.stringify({
    __type: SUNDAY_BULLETIN_TYPE,
    version: SUNDAY_BULLETIN_VERSION,
    ...data,
    seasonWeek: weekNumber,
    // 고정 문구도 JSON에 함께 저장해 데이터 일관성을 유지합니다.
    callToWorship: SUNDAY_BULLETIN_FIXED.orderFixed.callToWorship,
    fellowship: SUNDAY_BULLETIN_FIXED.orderFixed.fellowship,
  })
}

export function isSundayBulletinWeeklyEmpty(weekly) {
  if (!weekly) {
    return true
  }

  return Object.values(createEmptySundayBulletinWeekly(weekly)).every(
    (value) => !String(value ?? '').trim(),
  )
}

/**
 * 주보 좌측 절기 표기를 두 줄로 나눕니다.
 * 주차 숫자만 있어도 "성령강림절 후" / "제 N 주"로 표시합니다.
 */
export function formatSeasonWeekLines(seasonWeek) {
  const weekNumber = extractSeasonWeekNumber(seasonWeek)
  if (weekNumber) {
    return [SUNDAY_BULLETIN_FIXED.seasonPrefix, `제 ${weekNumber} 주`]
  }

  const text = String(seasonWeek ?? '').trim()
  if (!text) {
    return []
  }

  if (text.includes('\n')) {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  }

  return [text]
}
