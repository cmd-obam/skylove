import { supabase } from '@/lib/supabase'

export async function submitThanksgivingGameScore(score) {
  const numericScore = Number(score)

  if (!Number.isFinite(numericScore) || numericScore < 0) {
    return { success: false, error: new Error('invalid score') }
  }

  const { data, error } = await supabase.rpc('submit_thanksgiving_game_score', {
    p_score: Math.floor(numericScore),
  })

  if (error) {
    return { success: false, error }
  }

  const row = Array.isArray(data) ? data[0] : data
  return {
    success: true,
    bestScore: Number(row?.best_score ?? numericScore),
    isNewBest: Boolean(row?.is_new_best),
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
    userId: row.user_id,
    displayName: row.display_name || '회원',
    bestScore: Number(row.best_score),
  }))

  return { success: true, rows, error: null }
}

export async function fetchMyThanksgivingGameScore() {
  const { data, error } = await supabase.rpc('get_my_thanksgiving_game_score')

  if (error) {
    return { success: false, error, bestScore: null, rank: null }
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    return { success: true, bestScore: null, rank: null, error: null }
  }

  return {
    success: true,
    bestScore: row.best_score == null ? null : Number(row.best_score),
    rank: row.rank == null ? null : Number(row.rank),
    error: null,
  }
}
