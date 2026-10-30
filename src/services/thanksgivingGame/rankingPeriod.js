/** KST window: 2026-10-25 00:00:00 inclusive through 2026-10-30 23:59:00 exclusive. */
export const THANKSGIVING_RANKING_PERIOD_START = '2026-10-25T00:00:00+09:00'
export const THANKSGIVING_RANKING_PERIOD_END = '2026-10-30T23:59:00+09:00'

export const THANKSGIVING_RANKING_PERIOD_CLOSED_MESSAGE =
  '랭킹 기록 기간이 종료되어 더 이상 점수가 등록되지 않습니다.'

export const THANKSGIVING_EVENT_ENDED_MESSAGE = '이벤트 기간이 종료되었습니다.'

const PERIOD_START_MS = Date.parse(THANKSGIVING_RANKING_PERIOD_START)
const PERIOD_END_MS = Date.parse(THANKSGIVING_RANKING_PERIOD_END)

export function isThanksgivingRankingPeriodOpen(at = new Date()) {
  const ms = at instanceof Date ? at.getTime() : Date.parse(at)
  if (!Number.isFinite(ms)) return false
  return ms >= PERIOD_START_MS && ms < PERIOD_END_MS
}

export function isThanksgivingRankingPeriodClosedError(error) {
  const text = [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(' ')
  return /ranking period closed/i.test(text)
}
