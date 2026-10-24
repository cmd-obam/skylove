export function validateGameNickname(value, { maxLength = 12 } = {}) {
  const nickname = String(value ?? '').trim()
  if (!nickname) {
    return { ok: false, nickname: '', message: '닉네임을 입력해 주세요.' }
  }
  if (nickname.length < 2) {
    return { ok: false, nickname, message: '닉네임은 2자 이상이어야 해요.' }
  }
  if (nickname.length > maxLength) {
    return {
      ok: false,
      nickname,
      message: `닉네임은 ${maxLength}자 이하로 입력해 주세요.`,
    }
  }
  return { ok: true, nickname, message: '' }
}

/**
 * Ranking identity is never the display name.
 * A live session always submits as the auth user, even if the page still has a guest key.
 */
export function buildThanksgivingScorePayload({
  score,
  displayName,
  guestKey = null,
  hasSession = false,
}) {
  const numericScore = Number(score)
  const nameCheck = validateGameNickname(displayName, { maxLength: hasSession ? 20 : 12 })

  if (!Number.isFinite(numericScore) || numericScore < 0) {
    return { ok: false, error: 'invalid score' }
  }
  if (!nameCheck.ok) {
    return { ok: false, error: nameCheck.message }
  }

  return {
    ok: true,
    payload: {
      p_score: Math.floor(numericScore),
      p_display_name: nameCheck.nickname,
      p_guest_key: hasSession ? null : guestKey,
    },
  }
}

export function normalizeRankingName(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function collapseRankingRowsByName(rows) {
  const byName = new Map()

  for (const row of rows) {
    const nameKey = normalizeRankingName(row?.displayName)
    if (!nameKey) continue

    const previous = byName.get(nameKey)
    if (!previous || row.bestScore > previous.bestScore) {
      byName.set(nameKey, {
        ...row,
        displayName: String(row.displayName).trim(),
      })
    }
  }

  return rankScoreRows([...byName.values()])
}

export function rankForDisplayName(rows, displayName) {
  const nameKey = normalizeRankingName(displayName)
  if (!nameKey) return null
  const match = rows.find((row) => normalizeRankingName(row.displayName) === nameKey)
  return match ? match.rank : null
}

export function rankingIdentityKey(row) {
  if (row?.playerKind === 'member' && row.userId) {
    return `m:${row.userId}`
  }
  if (row?.playerKind === 'guest' && row.guestKey) {
    return `g:${row.guestKey}`
  }
  return `unknown:${row?.entryId ?? ''}`
}

export function collapseRankingRows(rows) {
  const byIdentity = new Map()

  for (const row of rows) {
    const key = rankingIdentityKey(row)
    const previous = byIdentity.get(key)
    if (!previous || row.bestScore > previous.bestScore) {
      byIdentity.set(key, row)
    }
  }

  return rankScoreRows([...byIdentity.values()])
}

export function rankScoreRows(rows) {
  const sorted = [...rows].sort((a, b) => {
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore
    return String(a.displayName).localeCompare(String(b.displayName), 'ko')
  })

  let rank = 0
  let lastScore = null
  return sorted.map((row) => {
    if (row.bestScore !== lastScore) {
      rank += 1
      lastScore = row.bestScore
    }
    return { ...row, rank }
  })
}
