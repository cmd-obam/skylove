import { supabase } from '@/lib/supabase'

const PAGE_LIMIT = 12

function missingPrayerSchema(error) {
  const message = String(error?.message ?? '')
  const code = String(error?.code ?? '')

  return (
    code === 'PGRST202' ||
    code === '42883' ||
    /could not find the function/i.test(message) ||
    /schema cache/i.test(message)
  )
}

function fail(error) {
  if (missingPrayerSchema(error)) {
    return {
      success: false,
      message: '중보기도 데이터베이스가 아직 적용되지 않았습니다. Supabase SQL을 실행해 주세요.',
    }
  }

  return {
    success: false,
    message: error?.message || '요청을 처리하지 못했습니다.',
  }
}

export function mapPrayerRow(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    category: row.category,
    title: row.title,
    content: row.content,
    isAnonymous: Boolean(row.is_anonymous),
    visibility: row.visibility,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    participantCount: Number(row.participant_count ?? 0),
    viewerParticipating: Boolean(row.viewer_participating),
    authorLabel: row.author_label || '회원',
    authorUserId: row.author_user_id || null,
    isOwner: Boolean(row.is_owner),
    canEdit: Boolean(row.can_edit),
    canDelete: Boolean(row.can_delete),
    canChangeStatus: Boolean(row.can_change_status),
  }
}

function cleanFilter(value) {
  if (value == null || value === '' || value === 'all') {
    return null
  }

  return value
}

export async function fetchPrayerFeed({
  category,
  status,
  visibility,
  query,
  withParticipants = false,
  limit = PAGE_LIMIT,
  offset = 0,
  id = null,
} = {}) {
  const { data, error } = await supabase.rpc('list_prayer_requests', {
    p_category: cleanFilter(category),
    p_status: cleanFilter(status),
    p_visibility: cleanFilter(visibility),
    p_query: query?.trim() ? query.trim() : null,
    p_with_participants: withParticipants ? true : null,
    p_limit: limit,
    p_offset: offset,
    p_id: id,
  })

  if (error) {
    return fail(error)
  }

  return {
    success: true,
    rows: (data ?? []).map(mapPrayerRow),
  }
}

export async function fetchPrayerRequest(id) {
  const result = await fetchPrayerFeed({ id, limit: 1, offset: 0 })

  if (!result.success) {
    return result
  }

  const prayer = result.rows[0] ?? null

  if (!prayer) {
    return {
      success: false,
      notFound: true,
      message: '기도 제목을 찾을 수 없거나 볼 수 없습니다.',
    }
  }

  return { success: true, prayer }
}

export async function fetchPrayerStats() {
  const { data, error } = await supabase.rpc('get_prayer_stats')

  if (error) {
    return fail(error)
  }

  const row = Array.isArray(data) ? data[0] : data

  if (!row) {
    return {
      success: false,
      message: '기도 통계를 불러오지 못했습니다.',
    }
  }

  return {
    success: true,
    stats: {
      togetherCount: Number(row.together_count ?? 0),
      prayingCount: Number(row.praying_count ?? 0),
      answeredCount: Number(row.answered_count ?? 0),
    },
  }
}

export async function fetchPrayerAccess() {
  const { data, error } = await supabase.rpc('get_prayer_access')

  if (error) {
    return { ...fail(error), access: { canViewPrivate: false, isSuperAdmin: false } }
  }

  const row = Array.isArray(data) ? data[0] : data

  return {
    success: true,
    access: {
      canViewPrivate: Boolean(row?.can_view_private),
      isSuperAdmin: Boolean(row?.is_super_admin),
    },
  }
}

export async function createPrayerRequest(draft) {
  const { data, error } = await supabase.rpc('create_prayer_request', {
    p_category: draft.category,
    p_title: draft.title.trim(),
    p_content: draft.content.trim(),
    p_is_anonymous: Boolean(draft.isAnonymous),
    p_visibility: draft.visibility,
    p_writer_name: draft.writerName?.trim() || null,
  })

  if (error) {
    return fail(error)
  }

  return { success: true, id: data }
}

export async function updatePrayerRequest(id, draft) {
  const { data, error } = await supabase.rpc('update_prayer_request', {
    p_id: id,
    p_category: draft.category,
    p_title: draft.title.trim(),
    p_content: draft.content.trim(),
    p_is_anonymous: Boolean(draft.isAnonymous),
    p_visibility: draft.visibility,
    p_status: draft.status,
    p_writer_name: draft.writerName?.trim() || null,
  })

  if (error) {
    return fail(error)
  }

  return { success: true, id: data }
}

export async function setPrayerStatus(id, status) {
  const { data, error } = await supabase.rpc('set_prayer_status', {
    p_id: id,
    p_status: status,
  })

  if (error) {
    return fail(error)
  }

  return { success: true, status: data }
}

export async function deletePrayerRequest(id) {
  const { error } = await supabase.rpc('delete_prayer_request', { p_id: id })

  if (error) {
    return fail(error)
  }

  return { success: true }
}

export async function togglePrayerParticipation(id) {
  const { data, error } = await supabase.rpc('toggle_prayer_participation', { p_id: id })

  if (error) {
    return fail(error)
  }

  return { success: true, participating: Boolean(data) }
}

export async function savePrayerParticipation(id, message) {
  const { error } = await supabase.rpc('save_prayer_participation', {
    p_id: id,
    p_message: message.trim(),
  })

  if (error) {
    return fail(error)
  }

  return { success: true }
}

export async function fetchPrayerParticipants(id) {
  const { data, error } = await supabase.rpc('list_prayer_participants', { p_id: id })

  if (error) {
    return fail(error)
  }

  return {
    success: true,
    participants: (data ?? []).map((row) => ({
      userId: row.user_id,
      displayName: row.display_name || '회원',
      createdAt: row.created_at,
      message: row.message || '',
      isMine: Boolean(row.is_mine),
    })),
  }
}

export const PRAYER_PAGE_SIZE = PAGE_LIMIT
