import { supabase } from '@/lib/supabase'

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

export function validateGameNickname(value) {
  const nickname = String(value ?? '').trim()
  if (!nickname) {
    return { ok: false, nickname: '', message: '닉네임을 입력해 주세요.' }
  }
  if (nickname.length < 2) {
    return { ok: false, nickname, message: '닉네임은 2자 이상이어야 해요.' }
  }
  if (nickname.length > 12) {
    return { ok: false, nickname, message: '닉네임은 12자 이하로 입력해 주세요.' }
  }
  return { ok: true, nickname, message: '' }
}

export async function submitThanksgivingGameScore({
  score,
  displayName,
  guestKey = null,
  isLoggedIn = false,
}) {
  const numericScore = Number(score)
  const nameCheck = validateGameNickname(displayName)

  if (!Number.isFinite(numericScore) || numericScore < 0) {
    return { success: false, error: new Error('invalid score') }
  }
  if (!nameCheck.ok) {
    return { success: false, error: new Error(nameCheck.message) }
  }

  const payload = {
    p_score: Math.floor(numericScore),
    p_display_name: nameCheck.nickname,
    p_guest_key: isLoggedIn ? null : guestKey,
  }

  const { data, error } = await supabase.rpc('submit_thanksgiving_game_score', payload)

  if (error) {
    return { success: false, error }
  }

  const row = Array.isArray(data) ? data[0] : data
  return {
    success: true,
    bestScore: Number(row?.best_score ?? numericScore),
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

  return { success: true, rows, error: null }
}

export async function fetchMyThanksgivingGameScore({ isLoggedIn = false, guestKey = null } = {}) {
  const { data, error } = await supabase.rpc('get_my_thanksgiving_game_score', {
    p_guest_key: isLoggedIn ? null : guestKey,
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
