import { supabase } from '@/lib/supabase'

function mapRpcError(error, fallback) {
  if (!error) {
    return fallback
  }

  if (error.message?.includes('접근 권한이 없습니다')) {
    return '접근 권한이 없습니다.'
  }

  if (error.code === 'PGRST202' || /Could not find the function/i.test(error.message ?? '')) {
    return '콘텐츠 관리 DB 함수가 없습니다. supabase/fix_super_admin_content_cms.sql 을 실행해 주세요.'
  }

  return error.message || fallback
}

export async function fetchContentPostsForSuperAdmin(filters = {}) {
  const payload = {
    search: filters.search || '',
    search_field: filters.searchField || 'all',
    post_type: filters.postType || '',
    status: filters.status || 'all',
    has_image: filters.hasImage ? 'true' : '',
    has_attachment: filters.hasAttachment ? 'true' : '',
    period: filters.period || '',
    date_from: filters.dateFrom || '',
    date_to: filters.dateTo || '',
    sort: filters.sort || 'newest',
    limit: filters.limit ?? 20,
    offset: filters.offset ?? 0,
  }

  const { data, error } = await supabase.rpc('list_content_posts_for_super_admin', {
    p_payload: payload,
  })

  if (error) {
    return {
      success: false,
      message: mapRpcError(error, '게시글 목록을 불러오지 못했습니다.'),
      posts: [],
      totalCount: 0,
    }
  }

  const rows = data ?? []
  return {
    success: true,
    posts: rows,
    totalCount: Number(rows[0]?.total_count ?? 0),
  }
}

export async function fetchContentCommentsForSuperAdmin(filters = {}) {
  const payload = {
    search: filters.search || '',
    search_field: filters.searchField || 'all',
    post_type: filters.postType || '',
    status: filters.status || 'all',
    period: filters.period || '',
    date_from: filters.dateFrom || '',
    date_to: filters.dateTo || '',
    sort: filters.sort || 'newest',
    limit: filters.limit ?? 20,
    offset: filters.offset ?? 0,
  }

  const { data, error } = await supabase.rpc('list_content_comments_for_super_admin', {
    p_payload: payload,
  })

  if (error) {
    return {
      success: false,
      message: mapRpcError(error, '댓글 목록을 불러오지 못했습니다.'),
      comments: [],
      totalCount: 0,
    }
  }

  const rows = data ?? []
  return {
    success: true,
    comments: rows,
    totalCount: Number(rows[0]?.total_count ?? 0),
  }
}

export async function bulkUpdatePostsForSuperAdmin(ids, action) {
  const { data, error } = await supabase.rpc('bulk_update_posts_for_super_admin', {
    p_payload: { ids, action },
  })

  if (error) {
    return { success: false, message: mapRpcError(error, '게시글 일괄 처리에 실패했습니다.') }
  }

  return { success: true, affected: data?.affected ?? 0 }
}

export async function bulkUpdateCommentsForSuperAdmin(ids, action) {
  const { data, error } = await supabase.rpc('bulk_update_comments_for_super_admin', {
    p_payload: { ids, action },
  })

  if (error) {
    return { success: false, message: mapRpcError(error, '댓글 일괄 처리에 실패했습니다.') }
  }

  return { success: true, affected: data?.affected ?? 0 }
}

export async function fetchPurgedPostsForSuperAdmin(filters = {}) {
  const payload = {
    search: filters.search || '',
    post_type: filters.postType || '',
    limit: filters.limit ?? 20,
    offset: filters.offset ?? 0,
  }

  const { data, error } = await supabase.rpc('list_purged_posts_for_super_admin', {
    p_payload: payload,
  })

  if (error) {
    return {
      success: false,
      message: mapRpcError(error, '영구삭제 게시글 목록을 불러오지 못했습니다.'),
      posts: [],
      totalCount: 0,
    }
  }

  const rows = data ?? []
  return {
    success: true,
    posts: rows,
    totalCount: Number(rows[0]?.total_count ?? 0),
  }
}

export async function restorePurgedPostsForSuperAdmin(ids) {
  const { data, error } = await supabase.rpc('restore_purged_posts_for_super_admin', {
    p_payload: { ids },
  })

  if (error) {
    return { success: false, message: mapRpcError(error, '게시글 복원에 실패했습니다.') }
  }

  return { success: true, affected: data?.affected ?? 0 }
}

export async function updatePurgedPostForSuperAdmin({ id, title, content, status, restore = false }) {
  const { data, error } = await supabase.rpc('update_purged_post_for_super_admin', {
    p_payload: {
      id,
      title,
      content,
      status,
      restore: restore ? 'true' : 'false',
    },
  })

  if (error) {
    return { success: false, message: mapRpcError(error, '게시글 저장에 실패했습니다.') }
  }

  return { success: true, restored: Boolean(data?.restored) }
}

export async function fetchAdminContentNote(targetType, targetId) {
  const { data, error } = await supabase.rpc('get_admin_content_note_for_super_admin', {
    p_target_type: targetType,
    p_target_id: targetId,
  })

  if (error) {
    return { success: false, message: mapRpcError(error, '메모를 불러오지 못했습니다.'), note: null }
  }

  return { success: true, note: data?.[0] ?? null }
}

export async function saveAdminContentNote(targetType, targetId, body) {
  const { error } = await supabase.rpc('save_admin_content_note_for_super_admin', {
    p_payload: {
      target_type: targetType,
      target_id: targetId,
      body,
    },
  })

  if (error) {
    return { success: false, message: mapRpcError(error, '메모 저장에 실패했습니다.') }
  }

  return { success: true }
}

export async function fetchMemberDetailForSuperAdmin(userId) {
  const { data, error } = await supabase.rpc('get_member_detail_for_super_admin', {
    p_user_id: userId,
  })

  if (error) {
    return {
      success: false,
      message: mapRpcError(error, '회원 정보를 불러오지 못했습니다.'),
      member: null,
    }
  }

  return { success: true, member: data?.[0] ?? null }
}
