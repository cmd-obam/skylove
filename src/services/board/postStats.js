import { supabase } from '@/lib/supabase'

export async function fetchPostMeta(postType, postId) {
  const { data, error } = await supabase
    .from('board_post_meta')
    .select('views_count, likes_count, comments_count')
    .eq('post_type', postType)
    .eq('post_id', String(postId))
    .maybeSingle()

  if (error) {
    return {
      success: false,
      message: error.message,
      stats: null,
    }
  }

  return {
    success: true,
    stats: data ?? {
      views_count: 0,
      likes_count: 0,
      comments_count: 0,
    },
  }
}

export async function incrementPostViews(postType, postId) {
  const { data, error } = await supabase.rpc('increment_board_post_views', {
    p_post_type: postType,
    p_post_id: String(postId),
  })

  if (error) {
    return {
      success: false,
      message: error.message,
      stats: null,
    }
  }

  return {
    success: true,
    stats: {
      views_count: data.views_count ?? 0,
      likes_count: data.likes_count ?? 0,
      comments_count: data.comments_count ?? 0,
    },
  }
}

export function subscribePostMeta(postType, postId, onChange) {
  const channel = supabase
    .channel(`board-post-meta:${postType}:${postId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'board_post_meta',
        filter: `post_type=eq.${postType}`,
      },
      async () => {
        const result = await fetchPostMeta(postType, postId)

        if (result.success) {
          onChange(result.stats)
        }
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
