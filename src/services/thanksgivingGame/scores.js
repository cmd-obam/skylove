import { supabase } from '@/lib/supabase'
import { getPublicDisplayName } from '@/utils/getPublicDisplayName'
import {
  buildThanksgivingScorePayload,
  collapseRankingRows,
  rankScoreRows,
} from '@/services/thanksgivingGame/rankingIdentity'

export { buildThanksgivingScorePayload, collapseRankingRows, rankingIdentityKey, validateGameNickname } from '@/services/thanksgivingGame/rankingIdentity'

const GUEST_KEY_STORAGE = 'skylove:tg-game:guest-key'

export function getOrCreateGuestKey() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    let key = window.localStorage.getItem(GUEST_KEY_STORAGE)
    if (!key) {
      key =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      window.localStorage.setItem(GUEST_KEY_STORAGE, key)
    }
    return key
  } catch {
    return null
  }
}

async function overlayMemberDisplayNames(rows) {
  const userIds = [
    ...new Set(rows.filter((row) => row.playerKind === 'member' && row.userId).map((row) => row.userId)),
  ]
  if (!userIds.length) return rows

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id,name,nickname,nickname_enabled')
    .in('user_id', userIds)

  if (error || !Array.isArray(data)) return rows

  const profiles = new Map(data.map((profile) => [profile.user_id, profile]))
  return rows.map((row) => {
    if (row.playerKind !== 'member' || !row.userId) return row
    const profile = profiles.get(row.userId)
    if (!profile) return row
    const displayName = getPublicDisplayName(
      {
        name: profile.name,
        nickname: profile.nickname,
        nicknameEnabled: profile.nickname_enabled,
      },
      { fallback: row.displayName || '회원' },
    )
    return { ...row, displayName }
  })
}

export async function submitThanksgivingGameScore({
  score,
  displayName,
  guestKey = null,
}) {
  const { data: sessionData } = await supabase.auth.getSession()
  const hasSession = Boolean(sessionData?.session?.user)
  const built = buildThanksgivingScorePayload({
    score,
    displayName,
    guestKey,
    hasSession,
  })

  if (!built.ok) {
    return { success: false, error: new Error(built.error) }
  }

  const { data, error } = await supabase.rpc('submit_thanksgiving_game_score', built.payload)

  if (error) {
    return { success: false, error }
  }

  const row = Array.isArray(data) ? data[0] : data
  return {
    success: true,
    bestScore: Number(row?.best_score ?? built.payload.p_score),
    isNewBest: Boolean(row?.is_new_best),
    entryId: row?.entry_id ?? null,
  }
}

export async function fetchThanksgivingGameRanking(limitCount = 20) {
  const { data, error } = await supabase.rpc('get_thanksgiving_game_ranking', {
    limit_count: limitCount,
  })

  if (error) {
    return { success: false, error, rows: [] }
  }

  const rows = (data ?? []).map((row) => ({
    rank: Number(row.rank),
    entryId: row.entry_id,
    playerKind: row.player_kind,
    userId: row.user_id,
    guestKey: row.guest_key,
    displayName: row.display_name || '플레이어',
    bestScore: Number(row.best_score),
  }))

  const canonical = await canonicalizeMemberIds(rows)
  const collapsed = collapseRankingRows(canonical)
  const named = await overlayMemberDisplayNames(collapsed)
  return { success: true, rows: rankScoreRows(named), error: null }
}

async function canonicalizeMemberIds(rows) {
  const userIds = [
    ...new Set(rows.filter((row) => row.playerKind === 'member' && row.userId).map((row) => row.userId)),
  ]
  if (!userIds.length) return rows

  const resolved = await Promise.all(
    userIds.map(async (userId) => {
      const { data, error } = await supabase.rpc('resolve_primary_user_id', { p_user_id: userId })
      return [userId, error || !data ? userId : data]
    }),
  )
  const primaryIds = new Map(resolved)

  return rows.map((row) => {
    if (row.playerKind !== 'member' || !row.userId) return row
    return { ...row, userId: primaryIds.get(row.userId) || row.userId }
  })
}

export async function fetchMyThanksgivingGameScore({ guestKey = null } = {}) {
  const { data: sessionData } = await supabase.auth.getSession()
  const hasSession = Boolean(sessionData?.session?.user)
  const { data, error } = await supabase.rpc('get_my_thanksgiving_game_score', {
    p_guest_key: hasSession ? null : guestKey,
  })

  if (error) {
    return { success: false, error, bestScore: null, rank: null, entryId: null }
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    return { success: true, bestScore: null, rank: null, entryId: null, error: null }
  }

  return {
    success: true,
    bestScore: row.best_score == null ? null : Number(row.best_score),
    rank: row.rank == null ? null : Number(row.rank),
    entryId: row.entry_id ?? null,
    error: null,
  }
}
