import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildThanksgivingScorePayload,
  collapseRankingRows,
  rankingIdentityKey,
} from '../src/services/thanksgivingGame/rankingIdentity.js'

test('logged-in submit does not send a guest key', () => {
  const result = buildThanksgivingScorePayload({
    score: 42.9,
    displayName: '한찬우',
    guestKey: 'guest-key-12345678',
    hasSession: true,
  })

  assert.equal(result.ok, true)
  assert.equal(result.payload.p_guest_key, null)
  assert.equal(result.payload.p_score, 42)
  assert.equal(result.payload.p_display_name, '한찬우')
})

test('logged-out submit keeps the guest key', () => {
  const result = buildThanksgivingScorePayload({
    score: 10,
    displayName: '성민',
    guestKey: '9e16f798-guest-key',
    hasSession: false,
  })

  assert.equal(result.ok, true)
  assert.equal(result.payload.p_guest_key, '9e16f798-guest-key')
})

test('same member id collapses to the best score', () => {
  const rows = collapseRankingRows([
    {
      entryId: 'low',
      playerKind: 'member',
      userId: 'member-a',
      guestKey: null,
      displayName: '성민',
      bestScore: 10,
    },
    {
      entryId: 'high',
      playerKind: 'member',
      userId: 'member-a',
      guestKey: null,
      displayName: '다른이름',
      bestScore: 80,
    },
  ])

  assert.equal(rows.length, 1)
  assert.equal(rows[0].entryId, 'high')
  assert.equal(rows[0].bestScore, 80)
  assert.equal(rows[0].rank, 1)
})

test('a lower replay does not replace the best score', () => {
  const rows = collapseRankingRows([
    {
      entryId: 'best',
      playerKind: 'member',
      userId: 'member-a',
      guestKey: null,
      displayName: '한찬우',
      bestScore: 398,
    },
    {
      entryId: 'later',
      playerKind: 'member',
      userId: 'member-a',
      guestKey: null,
      displayName: '한찬우',
      bestScore: 20,
    },
  ])

  assert.equal(rows.length, 1)
  assert.equal(rows[0].bestScore, 398)
})

test('different members with the same name stay separate', () => {
  const rows = collapseRankingRows([
    {
      entryId: 'a',
      playerKind: 'member',
      userId: 'member-a',
      guestKey: null,
      displayName: '성민',
      bestScore: 50,
    },
    {
      entryId: 'b',
      playerKind: 'member',
      userId: 'member-b',
      guestKey: null,
      displayName: '성민',
      bestScore: 40,
    },
  ])

  assert.equal(rows.length, 2)
  assert.deepEqual(
    rows.map((row) => row.userId),
    ['member-a', 'member-b'],
  )
})

test('a member and a guest with the same name stay separate', () => {
  const rows = collapseRankingRows([
    {
      entryId: 'member',
      playerKind: 'member',
      userId: 'member-a',
      guestKey: null,
      displayName: '한찬우',
      bestScore: 398,
    },
    {
      entryId: 'guest',
      playerKind: 'guest',
      userId: null,
      guestKey: 'guest-1',
      displayName: '한찬우',
      bestScore: 42,
    },
  ])

  assert.equal(rows.length, 2)
  assert.equal(rankingIdentityKey(rows[0]).startsWith('m:'), true)
  assert.equal(rankingIdentityKey(rows[1]).startsWith('g:'), true)
})

test('different guest keys with the same name stay separate', () => {
  const rows = collapseRankingRows([
    {
      entryId: 'g1',
      playerKind: 'guest',
      userId: null,
      guestKey: 'key-1',
      displayName: '성민',
      bestScore: 487,
    },
    {
      entryId: 'g2',
      playerKind: 'guest',
      userId: null,
      guestKey: 'key-2',
      displayName: '성민',
      bestScore: 85,
    },
  ])

  assert.equal(rows.length, 2)
})

test('the same guest key keeps only the best score', () => {
  const rows = collapseRankingRows([
    {
      entryId: 'old',
      playerKind: 'guest',
      userId: null,
      guestKey: 'same-key',
      displayName: '혜미',
      bestScore: 16,
    },
    {
      entryId: 'new',
      playerKind: 'guest',
      userId: null,
      guestKey: 'same-key',
      displayName: '혜미',
      bestScore: 4,
    },
  ])

  assert.equal(rows.length, 1)
  assert.equal(rows[0].bestScore, 16)
  assert.equal(rows[0].entryId, 'old')
})

test('a row with no member id and no guest key is not attached to anyone', () => {
  const rows = collapseRankingRows([
    {
      entryId: 'unknown-1',
      playerKind: 'guest',
      userId: null,
      guestKey: null,
      displayName: '관리자',
      bestScore: 14,
    },
    {
      entryId: 'member',
      playerKind: 'member',
      userId: 'admin-user',
      guestKey: null,
      displayName: '관리자',
      bestScore: 14,
    },
  ])

  assert.equal(rows.length, 2)
  assert.equal(rankingIdentityKey(rows.find((row) => row.entryId === 'unknown-1')), 'unknown:unknown-1')
})
