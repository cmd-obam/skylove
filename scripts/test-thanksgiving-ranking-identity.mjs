import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildThanksgivingScorePayload,
  collapseRankingRows,
  collapseRankingRowsByName,
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

test('the same display name keeps the highest score', () => {
  const rows = collapseRankingRowsByName([
    { entryId: 'a', playerKind: 'guest', userId: null, guestKey: 'k1', displayName: '성민', bestScore: 487 },
    { entryId: 'b', playerKind: 'member', userId: 'member-a', guestKey: null, displayName: '한찬우', bestScore: 398 },
    { entryId: 'c', playerKind: 'guest', userId: null, guestKey: 'k2', displayName: ' 성민 ', bestScore: 85 },
    { entryId: 'd', playerKind: 'guest', userId: null, guestKey: 'k3', displayName: '한찬우', bestScore: 42 },
    { entryId: 'e', playerKind: 'guest', userId: null, guestKey: 'k4', displayName: '혜미', bestScore: 16 },
    { entryId: 'f', playerKind: 'member', userId: 'admin', guestKey: null, displayName: '관리자', bestScore: 14 },
    { entryId: 'g', playerKind: 'guest', userId: null, guestKey: 'k5', displayName: '최성민', bestScore: 10 },
  ])

  assert.deepEqual(
    rows.map((row) => [row.rank, row.displayName, row.bestScore]),
    [
      [1, '성민', 487],
      [2, '한찬우', 398],
      [3, '혜미', 16],
      [4, '관리자', 14],
      [5, '최성민', 10],
    ],
  )
})

test('a lower score for the same name does not replace the best', () => {
  const rows = collapseRankingRowsByName([
    { entryId: 'best', displayName: '성민', bestScore: 487 },
    { entryId: 'later', displayName: '성민', bestScore: 300 },
  ])

  assert.equal(rows.length, 1)
  assert.equal(rows[0].bestScore, 487)
})

test('a higher score for the same name becomes the ranking score', () => {
  const rows = collapseRankingRowsByName([
    { entryId: 'old', displayName: '성민', bestScore: 487 },
    { entryId: 'new', displayName: '성민', bestScore: 595 },
  ])

  assert.equal(rows.length, 1)
  assert.equal(rows[0].bestScore, 595)
  assert.equal(rows[0].entryId, 'new')
  assert.equal(rows[0].rank, 1)
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

test('records stay separate identities until the ranking name collapse', () => {
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
  assert.equal(collapseRankingRowsByName(rows).length, 1)
})
