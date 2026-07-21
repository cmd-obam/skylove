import { supabase } from '@/lib/supabase'

function mapCommentRow(row, likeMeta = {}) {
  return {
    id: row.id,
    postType: row.post_type,
    postId: row.post_id,
    userId: row.user_id,
    authorName: row.author_name,
    body: row.body,
    isHidden: row.is_hidden,
    isPinned: row.is_pinned,
    isReported: row.is_reported,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    likeCount: likeMeta.likeCount ?? 0,
    likedByMe: likeMeta.likedByMe ?? false,
  }
}

async function attachCommentLikes(comments, userId) {
  if (!comments.length) {
    return []
  }

  const commentIds = comments.map((comment) => comment.id)

  const { data: likes, error } = await supabase
    .from('comment_likes')
    .select('comment_id, user_id')
    .in('comment_id', commentIds)

  if (error) {
    return comments.map((comment) => mapCommentRow(comment))
  }

  const likeCountMap = new Map()
  const likedByMeMap = new Map()

  likes.forEach((like) => {
    likeCountMap.set(like.comment_id, (likeCountMap.get(like.comment_id) ?? 0) + 1)

    if (userId && like.user_id === userId) {
      likedByMeMap.set(like.comment_id, true)
    }
  })

  return comments.map((comment) =>
    mapCommentRow(comment, {
      likeCount: likeCountMap.get(comment.id) ?? 0,
      likedByMe: likedByMeMap.get(comment.id) ?? false,
    }),
  )
}

/**
 * 게시글 목록용 댓글 수 (숨김 제외).
 * board_post_meta 사용 — 비회원(anon)도 조회 가능, board_comments 직접 조회는 RLS로 차단됨.
 */
export async function fetchCommentCountsMap(postType, postIds) {
  if (postIds.length === 0) {
    return {}
  }

  const { data, error } = await supabase
    .from('board_post_meta')
    .select('post_id, comments_count')
    .eq('post_type', postType)
    .in('post_id', postIds.map(String))

  if (error) {
    console.error('[Board] fetchCommentCountsMap failed', error)
    return {}
  }

  return (data ?? []).reduce((counts, row) => {
    const postId = String(row.post_id)
    counts[postId] = row.comments_count ?? 0
    return counts
  }, {})
}

export function subscribeCommentCounts(postType, onChange) {
  const channel = supabase
    .channel(`board-comment-counts:${postType}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'board_comments',
        filter: `post_type=eq.${postType}`,
      },
      () => onChange(),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function fetchComments(postType, postId, userId) {
  const { data, error } = await supabase
    .from('board_comments')
    .select('*')
    .eq('post_type', postType)
    .eq('post_id', String(postId))
    .is('deleted_at', null)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    return {
      success: false,
      message: '댓글을 불러오지 못했습니다.',
      comments: [],
    }
  }

  const comments = await attachCommentLikes(data ?? [], userId)

  return {
    success: true,
    comments,
  }
}

export async function createComment({ postType, postId, userId, authorName, body }) {
  const trimmedBody = body.trim()

  if (!trimmedBody) {
    return {
      success: false,
      message: '댓글 내용을 입력해주세요.',
    }
  }

  if (!userId) {
    return {
      success: false,
      message: '로그인 후 댓글을 작성할 수 있습니다.',
    }
  }

  const { data, error } = await supabase
    .from('board_comments')
    .insert({
      post_type: postType,
      post_id: String(postId),
      user_id: userId,
      author_name: authorName,
      body: trimmedBody,
    })
    .select('*')
    .single()

  if (error) {
    return {
      success: false,
      message: '댓글 등록 중 오류가 발생했습니다.',
    }
  }

  return {
    success: true,
    message: '댓글이 등록되었습니다.',
    comment: mapCommentRow(data),
  }
}

export async function updateCommentBody(commentId, body) {
  const trimmedBody = body.trim()

  if (!trimmedBody) {
    return {
      success: false,
      message: '댓글 내용을 입력해주세요.',
    }
  }

  const { data, error } = await supabase
    .from('board_comments')
    .update({
      body: trimmedBody,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .select('*')
    .single()

  if (error) {
    return {
      success: false,
      message: '댓글 수정 중 오류가 발생했습니다.',
    }
  }

  return {
    success: true,
    message: '댓글이 수정되었습니다.',
    comment: mapCommentRow(data),
  }
}

export async function setCommentHidden(commentId, isHidden) {
  const { error } = await supabase
    .from('board_comments')
    .update({
      is_hidden: isHidden,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)

  if (error) {
    return {
      success: false,
      message: '댓글 숨김 처리 중 오류가 발생했습니다.',
    }
  }

  return {
    success: true,
    message: isHidden ? '댓글이 숨김 처리되었습니다.' : '댓글 숨김이 해제되었습니다.',
  }
}

export async function setCommentPinned(commentId, isPinned) {
  const { error } = await supabase
    .from('board_comments')
    .update({
      is_pinned: isPinned,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)

  if (error) {
    return {
      success: false,
      message: '댓글 고정 처리 중 오류가 발생했습니다.',
    }
  }

  return {
    success: true,
    message: isPinned ? '댓글이 고정되었습니다.' : '댓글 고정이 해제되었습니다.',
  }
}

export async function resolveCommentReport(commentId) {
  const { error } = await supabase
    .from('board_comments')
    .update({
      is_reported: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)

  if (error) {
    return {
      success: false,
      message: '댓글 신고 처리 중 오류가 발생했습니다.',
    }
  }

  return {
    success: true,
    message: '댓글 신고가 처리되었습니다.',
  }
}

export async function deleteComment(commentId) {
  const { error } = await supabase.rpc('soft_delete_board_comment', {
    p_comment_id: commentId,
  })

  if (error) {
    return {
      success: false,
      message: error.message || '댓글 삭제 중 오류가 발생했습니다.',
    }
  }

  return {
    success: true,
    message: '댓글이 휴지통으로 이동되었습니다.',
  }
}

export async function toggleCommentLike({ commentId, userId, liked }) {
  if (!userId) {
    return {
      success: false,
      message: '로그인 후 추천할 수 있습니다.',
    }
  }

  if (liked) {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId)

    if (error) {
      return {
        success: false,
        message: '추천 취소 중 오류가 발생했습니다.',
      }
    }

    return { success: true, liked: false }
  }

  const { error } = await supabase.from('comment_likes').insert({
    comment_id: commentId,
    user_id: userId,
  })

  if (error) {
    return {
      success: false,
      message: '추천 중 오류가 발생했습니다.',
    }
  }

  return { success: true, liked: true }
}

export function subscribeComments(postType, postId, onChange) {
  const channel = supabase
    .channel(`board-comments:${postType}:${postId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'board_comments',
        filter: `post_type=eq.${postType}`,
      },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'comment_likes',
      },
      () => onChange(),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
