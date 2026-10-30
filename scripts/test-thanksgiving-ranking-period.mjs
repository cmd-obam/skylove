import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { buildThanksgivingScorePayload } from '../src/services/thanksgivingGame/rankingIdentity.js'
import {
  formatThanksgivingEventCountdown,
  getThanksgivingEventRemainingMs,
  isThanksgivingRankingPeriodClosedError,
  isThanksgivingRankingPeriodOpen,
  THANKSGIVING_EVENT_ENDED_MESSAGE,
  THANKSGIVING_RANKING_PERIOD_CLOSED_MESSAGE,
  THANKSGIVING_RANKING_PERIOD_END,
} from '../src/services/thanksgivingGame/rankingPeriod.js'

test('ranking opens at 2026-10-25 00:00 KST', () => {
  assert.equal(isThanksgivingRankingPeriodOpen('2026-10-25T00:00:00+09:00'), true)
})

test('ranking stays open just before 2026-10-30 23:59 KST', () => {
  assert.equal(isThanksgivingRankingPeriodOpen('2026-10-30T23:58:59+09:00'), true)
})

test('ranking closes at 2026-10-30 23:59 KST and stays closed afterwards', () => {
  assert.equal(THANKSGIVING_RANKING_PERIOD_END, '2026-10-30T23:59:00+09:00')
  assert.equal(isThanksgivingRankingPeriodOpen('2026-10-30T23:59:00+09:00'), false)
  assert.equal(isThanksgivingRankingPeriodOpen('2026-10-30T23:59:59+09:00'), false)
  assert.equal(isThanksgivingRankingPeriodOpen('2026-10-31T00:00:00+09:00'), false)
  assert.equal(isThanksgivingRankingPeriodOpen('2026-10-31T00:01:00+09:00'), false)
})

test('event countdown shows hours minutes and seconds until 23:59 KST', () => {
  const remainingMs = getThanksgivingEventRemainingMs({
    at: '2026-10-30T12:00:00+09:00',
    endsAt: THANKSGIVING_RANKING_PERIOD_END,
  })
  const countdown = formatThanksgivingEventCountdown(remainingMs)

  assert.equal(remainingMs, (11 * 60 + 59) * 60 * 1000)
  assert.deepEqual(countdown, {
    hours: 11,
    minutes: 59,
    seconds: 0,
    text: '11시간 59분 0초',
  })
  assert.equal(
    formatThanksgivingEventCountdown(
      getThanksgivingEventRemainingMs({
        at: '2026-10-30T23:59:00+09:00',
        endsAt: THANKSGIVING_RANKING_PERIOD_END,
      }),
    ).text,
    '0시간 0분 0초',
  )
})

test('ranking is closed before the window starts', () => {
  assert.equal(isThanksgivingRankingPeriodOpen('2026-10-24T23:59:59+09:00'), false)
})

test('score payload does not send a client clock', () => {
  const result = buildThanksgivingScorePayload({
    score: 12,
    displayName: '성민',
    guestKey: 'guest-key-12345678',
    hasSession: false,
  })

  assert.equal(result.ok, true)
  assert.deepEqual(Object.keys(result.payload).sort(), [
    'p_display_name',
    'p_guest_key',
    'p_score',
  ])
})

test('closed-period database errors are recognized without treating them as a saved score', () => {
  assert.equal(
    isThanksgivingRankingPeriodClosedError({ message: 'ranking period closed', code: '23514' }),
    true,
  )
  assert.equal(isThanksgivingRankingPeriodClosedError({ message: 'invalid score' }), false)
  assert.equal(
    THANKSGIVING_RANKING_PERIOD_CLOSED_MESSAGE,
    '랭킹 기록 기간이 종료되어 더 이상 점수가 등록되지 않습니다.',
  )
  assert.equal(THANKSGIVING_EVENT_ENDED_MESSAGE, '이벤트 기간이 종료되었습니다.')
})

test('database save function rejects writes from server time before it changes rows', () => {
  const sql = fs.readFileSync(
    new URL('../supabase/migrations/061_thanksgiving_ranking_period.sql', import.meta.url),
    'utf8',
  )
  const guard = sql.indexOf("IF NOT public.thanksgiving_ranking_period_open(now())")
  const firstDelete = sql.indexOf('DELETE FROM public.thanksgiving_game_entries')
  const firstInsert = sql.indexOf('INSERT INTO public.thanksgiving_game_entries')

  assert.ok(guard > 0)
  assert.ok(guard < firstDelete)
  assert.ok(guard < firstInsert)
  assert.match(sql, /timestamptz '2026-10-25 00:00:00\+09'/)
  assert.match(sql, /timestamptz '2026-10-30 23:59:00\+09'/)
  assert.match(sql, /BEFORE INSERT OR UPDATE ON public\.thanksgiving_game_entries/)
  assert.doesNotMatch(sql, /TRUNCATE|DELETE FROM public\.thanksgiving_game_entries\s*;/i)
})

test('event-end migration closes at Oct 30 23:59 KST and exposes a server status RPC', () => {
  const sql = fs.readFileSync(
    new URL('../supabase/migrations/065_thanksgiving_event_end_oct30.sql', import.meta.url),
    'utf8',
  )

  assert.match(sql, /timestamptz '2026-10-30 23:59:00\+09'/)
  assert.match(sql, /get_thanksgiving_ranking_period_status/)
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_thanksgiving_ranking_period_status/)
  assert.doesNotMatch(sql, /DELETE FROM public\.thanksgiving_game_entries/)
  assert.doesNotMatch(sql, /TRUNCATE/i)
})
