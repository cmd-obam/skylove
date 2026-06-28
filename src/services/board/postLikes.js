import { supabase } from '@/lib/supabase'

export async function fetchUserPostLike(postType, postId, userId) {
  if (!userId) {
    return { success: true, liked: false }
  }

  const { data, error } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_type', postType)
    .eq('post_id', String(postId))
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    return {
      success: false,
      liked: false,
      message: error.message,
    }
  }

  return {
    success: true,
    liked: Boolean(data),
    likeId: data?.id ?? null,
  }
}

export async function togglePostLike({ postType, postId, userId, liked }) {
  if (!userId) {
    return {
      success: false,
      message: '로그인 후 추천할 수 있습니다.',
    }
  }

  if (liked) {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_type', postType)
      .eq('post_id', String(postId))
      .eq('user_id', userId)

    if (error) {
      return {
        success: false,
        message: '추천 취소 중 오류가 발생했습니다.',
      }
    }

    return { success: true, liked: false }
  }

  const { error } = await supabase.from('post_likes').insert({
    post_type: postType,
    post_id: String(postId),
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

export function subscribePostLikes(postType, postId, onChange) {
  const channel = supabase
    .channel(`post-likes:${postType}:${postId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'post_likes',
        filter: `post_type=eq.${postType}`,
      },
      () => onChange(),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
