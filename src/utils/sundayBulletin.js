export const SUNDAY_BULLETIN_TYPE = 'sunday_bulletin'
export const SUNDAY_BULLETIN_VERSION = 1

export const EMPTY_SUNDAY_BULLETIN_WEEKLY = {
  seasonWeek: '',
  callToWorship: '',
  prayer: '',
  praise: '',
  responsiveReading: '',
  graceSong: '',
  fellowship: '',
  scripture: '',
  sermon: '',
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

export function parseSundayBulletinWeekly(content) {
  if (!isSundayBulletinContent(content)) {
    return null
  }

  try {
    const parsed = JSON.parse(content.trim())
    return createEmptySundayBulletinWeekly({
      seasonWeek: parsed.seasonWeek ?? '',
      callToWorship: parsed.callToWorship ?? '',
      prayer: parsed.prayer ?? '',
      praise: parsed.praise ?? '',
      responsiveReading: parsed.responsiveReading ?? '',
      graceSong: parsed.graceSong ?? '',
      fellowship: parsed.fellowship ?? '',
      scripture: parsed.scripture ?? '',
      sermon: parsed.sermon ?? '',
      churchNews: parsed.churchNews ?? '',
    })
  } catch {
    return null
  }
}

export function serializeSundayBulletinWeekly(weekly) {
  const data = createEmptySundayBulletinWeekly(weekly)

  return JSON.stringify({
    __type: SUNDAY_BULLETIN_TYPE,
    version: SUNDAY_BULLETIN_VERSION,
    ...data,
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
