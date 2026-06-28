import { BIRTH_DATE_MIN, getBirthDateMax, normalizeBirthDate } from '@/services/auth/signup'

const BIRTH_DATE_PARTS_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function getBirthDateYearRange() {
  const currentYear = new Date().getFullYear()
  const minYear = Number(BIRTH_DATE_MIN.slice(0, 4))
  const years = []

  for (let year = currentYear; year >= minYear; year -= 1) {
    years.push(year)
  }

  return years
}

export function getDaysInMonth(year, month) {
  return new Date(Number(year), Number(month), 0).getDate()
}

export function splitBirthDate(value) {
  if (!value) {
    return { year: '', month: '', day: '' }
  }

  const normalized = normalizeBirthDate(value)
  const match = normalized.match(BIRTH_DATE_PARTS_PATTERN)

  if (!match) {
    return { year: '', month: '', day: '' }
  }

  return {
    year: match[1],
    month: String(Number(match[2])),
    day: String(Number(match[3])),
  }
}

export function buildBirthDate(year, month, day) {
  if (!year || !month || !day) {
    return ''
  }

  return normalizeBirthDate(`${year}-${month}-${day}`)
}

export function getBirthDateDayRange(year, month) {
  if (!year || !month) {
    return []
  }

  const minDate = BIRTH_DATE_MIN
  const maxDate = getBirthDateMax()
  const maxDayInMonth = getDaysInMonth(year, month)

  let minDay = 1
  let maxDay = maxDayInMonth

  if (year === minDate.slice(0, 4) && Number(month) === Number(minDate.slice(5, 7))) {
    minDay = Number(minDate.slice(8, 10))
  }

  if (year === maxDate.slice(0, 4) && Number(month) === Number(maxDate.slice(5, 7))) {
    maxDay = Math.min(maxDayInMonth, Number(maxDate.slice(8, 10)))
  }

  const days = []

  for (let day = minDay; day <= maxDay; day += 1) {
    days.push(day)
  }

  return days
}

export function clampBirthDateDay(year, month, day) {
  if (!day) {
    return ''
  }

  const availableDays = getBirthDateDayRange(year, month)

  if (!availableDays.length) {
    return ''
  }

  const dayNumber = Number(day)

  if (availableDays.includes(dayNumber)) {
    return String(dayNumber)
  }

  return String(Math.min(dayNumber, availableDays[availableDays.length - 1]))
}
