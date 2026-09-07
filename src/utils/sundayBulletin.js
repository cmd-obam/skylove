import {
  SUNDAY_BULLETIN_FIXED,
  SUNDAY_BULLETIN_LOCKABLE_FIELDS,
  SUNDAY_BULLETIN_LOCKABLE_KEYS,
} from '@/data/sundayBulletinFixed'

export const SUNDAY_BULLETIN_TYPE = 'sunday_bulletin'
export const SUNDAY_BULLETIN_VERSION = 2

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

function createDefaultLocks() {
  return Object.fromEntries(SUNDAY_BULLETIN_LOCKABLE_KEYS.map((key) => [key, true]))
}

function createDefaultOverrides() {
  return Object.fromEntries(
    SUNDAY_BULLETIN_LOCKABLE_FIELDS.map((field) => [field.key, field.getDefault()]),
  )
}

export function createEmptySundayBulletinWeekly(overrides = {}) {
  const { locks: locksOverride, fixedOverrides: fixedOverridesInput, ...weeklyFields } =
    overrides ?? {}

  return {
    ...EMPTY_SUNDAY_BULLETIN_WEEKLY,
    ...weeklyFields,
    locks: {
      ...createDefaultLocks(),
      ...(locksOverride && typeof locksOverride === 'object' ? locksOverride : {}),
    },
    fixedOverrides: {
      ...createDefaultOverrides(),
      ...(fixedOverridesInput && typeof fixedOverridesInput === 'object'
        ? fixedOverridesInput
        : {}),
    },
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

function normalizeLocks(rawLocks = {}) {
  const locks = createDefaultLocks()
  if (!rawLocks || typeof rawLocks !== 'object') {
    return locks
  }

  SUNDAY_BULLETIN_LOCKABLE_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(rawLocks, key)) {
      locks[key] = Boolean(rawLocks[key])
    }
  })
  return locks
}

function normalizeFixedOverrides(rawOverrides = {}, parsedRoot = {}) {
  const overrides = createDefaultOverrides()

  SUNDAY_BULLETIN_LOCKABLE_FIELDS.forEach((field) => {
    if (rawOverrides && typeof rawOverrides === 'object' && rawOverrides[field.key] != null) {
      overrides[field.key] = String(rawOverrides[field.key])
      return
    }

    // 구버전 JSON에 루트로 저장된 일부 고정 문구 호환
    if (parsedRoot[field.key] != null && parsedRoot[field.key] !== '') {
      overrides[field.key] = String(parsedRoot[field.key])
    }
  })

  return overrides
}

export function isBulletinFieldLocked(weekly, key) {
  const locks = weekly?.locks
  if (!locks || typeof locks !== 'object' || !Object.prototype.hasOwnProperty.call(locks, key)) {
    return true
  }
  return Boolean(locks[key])
}

export function getBulletinFieldDefault(key) {
  const field = SUNDAY_BULLETIN_LOCKABLE_FIELDS.find((item) => item.key === key)
  return field ? field.getDefault() : ''
}

/** 잠금이면 기본값, 해제면 저장된 수정값(없으면 기본값) */
export function resolveBulletinFixedValue(weekly, key) {
  const fallback = getBulletinFieldDefault(key)
  if (isBulletinFieldLocked(weekly, key)) {
    return fallback
  }
  const override = weekly?.fixedOverrides?.[key]
  return override != null && String(override).length > 0 ? String(override) : fallback
}

export function parseServingPeopleText(text) {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return SUNDAY_BULLETIN_FIXED.servingPeople
  }

  return lines.map((line, index) => {
    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) {
      return { role: `항목${index + 1}`, name: line }
    }
    return {
      role: line.slice(0, separatorIndex).trim() || `항목${index + 1}`,
      name: line.slice(separatorIndex + 1).trim(),
    }
  })
}

export function parseMultilineText(text, fallbackLines = []) {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  return lines.length > 0 ? lines : fallbackLines
}

export function resolveSundayBulletinDisplay(weekly) {
  const data = createEmptySundayBulletinWeekly(weekly)

  return {
    weekly: data,
    serviceTitle: resolveBulletinFixedValue(data, 'serviceTitle'),
    serviceTime: resolveBulletinFixedValue(data, 'serviceTime'),
    moderator: resolveBulletinFixedValue(data, 'moderator'),
    seasonPrefix: resolveBulletinFixedValue(data, 'seasonPrefix'),
    missionTitle: resolveBulletinFixedValue(data, 'missionTitle'),
    missionLines: parseMultilineText(
      resolveBulletinFixedValue(data, 'missionLines'),
      SUNDAY_BULLETIN_FIXED.missionLines,
    ),
    graceChoir: resolveBulletinFixedValue(data, 'graceChoir'),
    orderFixed: {
      worshipPraise: resolveBulletinFixedValue(data, 'worshipPraise'),
      callToWorship: resolveBulletinFixedValue(data, 'callToWorship'),
      doxology: resolveBulletinFixedValue(data, 'doxology'),
      offeringPraise: resolveBulletinFixedValue(data, 'offeringPraise'),
      offeringPrayer: resolveBulletinFixedValue(data, 'offeringPrayer'),
      fellowship: resolveBulletinFixedValue(data, 'fellowship'),
      benediction: resolveBulletinFixedValue(data, 'benediction'),
    },
    servingPeople: parseServingPeopleText(resolveBulletinFixedValue(data, 'servingPeople')),
    missions: {
      lines: parseMultilineText(
        resolveBulletinFixedValue(data, 'missionsLines'),
        SUNDAY_BULLETIN_FIXED.missions.lines,
      ),
      denomination: resolveBulletinFixedValue(data, 'missionsDenomination'),
      churchName: resolveBulletinFixedValue(data, 'missionsChurchName'),
    },
  }
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
      locks: normalizeLocks(parsed.locks),
      fixedOverrides: normalizeFixedOverrides(parsed.fixedOverrides, parsed),
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
    seasonWeek: weekNumber,
    prayer: data.prayer,
    praise: data.praise,
    responsiveReading: data.responsiveReading,
    graceSong: data.graceSong,
    scripture: data.scripture,
    sermon: data.sermon,
    closingPraise: data.closingPraise,
    churchNews: data.churchNews,
    locks: data.locks,
    fixedOverrides: data.fixedOverrides,
    // 미리보기/구버전 호환용으로 현재 해석된 값도 함께 저장
    callToWorship: resolveBulletinFixedValue(data, 'callToWorship'),
    fellowship: resolveBulletinFixedValue(data, 'fellowship'),
  })
}

export function isSundayBulletinWeeklyEmpty(weekly) {
  if (!weekly) {
    return true
  }

  return Object.keys(EMPTY_SUNDAY_BULLETIN_WEEKLY).every(
    (key) => !String(weekly[key] ?? '').trim(),
  )
}

/**
 * 주보 좌측 절기 표기를 두 줄로 나눕니다.
 * 주차 숫자만 있어도 절기 문구 / "제 N 주"로 표시합니다.
 */
export function formatSeasonWeekLines(seasonWeek, seasonPrefix) {
  const prefix = String(seasonPrefix ?? SUNDAY_BULLETIN_FIXED.seasonPrefix).trim()
  const weekNumber = extractSeasonWeekNumber(seasonWeek)
  if (weekNumber) {
    return [prefix || SUNDAY_BULLETIN_FIXED.seasonPrefix, `제 ${weekNumber} 주`]
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
