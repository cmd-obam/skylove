import { THANKSGIVING_GAME_PATH } from '@/data/eventMenu'

/**
 * Home page event popup config.
 * Change `endDate` (YYYY-MM-DD, Asia/Seoul, inclusive) to control visibility.
 */
export const THANKSGIVING_POPUP = {
  id: 'thanksgiving-2026',
  /** Last day to show the popup (inclusive, Asia/Seoul calendar date). */
  endDate: '2026-11-01',
  imageAlt: '추수감사절 11월 1일 주일예배',
  storageKey: 'skylove:home-event-popup:thanksgiving-2026:hide-date',
  gamePath: THANKSGIVING_GAME_PATH,
  gameCtaLabel: '미니게임 시작하기',
}

/** Today as YYYY-MM-DD in Asia/Seoul. */
export function getSeoulDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function isHomeEventPopupActive(config, date = new Date()) {
  if (!config?.endDate) {
    return false
  }
  return getSeoulDateKey(date) <= config.endDate
}

export function shouldShowHomeEventPopup(config, date = new Date()) {
  if (typeof window === 'undefined' || !isHomeEventPopupActive(config, date)) {
    return false
  }

  try {
    const hideDate = window.localStorage.getItem(config.storageKey)
    if (hideDate && hideDate === getSeoulDateKey(date)) {
      return false
    }
  } catch {
    // localStorage unavailable — still allow popup
  }

  return true
}

export function hideHomeEventPopupForToday(config, date = new Date()) {
  if (typeof window === 'undefined' || !config?.storageKey) {
    return
  }

  try {
    window.localStorage.setItem(config.storageKey, getSeoulDateKey(date))
  } catch {
    // ignore quota / private mode failures
  }
}
