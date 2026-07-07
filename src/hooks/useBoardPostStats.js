import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchPostMeta, incrementPostViews, subscribePostMeta } from '@/services/board/postStats'
import { fetchUserPostLike, subscribePostLikes } from '@/services/board/postLikes'
import {
  getBoardViewSessionKey,
  hasRecordedBoardView,
  recordBoardView,
} from '@/utils/boardViewSession'

export function useBoardPostStats(postType, postId, fallbackViews = 0) {
  const location = useLocation()
  const [stats, setStats] = useState({
    viewsCount: fallbackViews,
    likesCount: 0,
    commentsCount: 0,
  })
  const [likedByMe, setLikedByMe] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const refreshStats = useCallback(async () => {
    const result = await fetchPostMeta(postType, postId)

    if (result.success) {
      setStats({
        viewsCount: result.stats.views_count ?? fallbackViews,
        likesCount: result.stats.likes_count ?? 0,
        commentsCount: result.stats.comments_count ?? 0,
      })
    }
  }, [fallbackViews, postId, postType])

  const refreshLikeState = useCallback(
    async (userId) => {
      const result = await fetchUserPostLike(postType, postId, userId)

      if (result.success) {
        setLikedByMe(result.liked)
      }
    },
    [postId, postType],
  )

  useEffect(() => {
    if (!postType || postId == null || postId === '') {
      setIsLoading(false)
      return undefined
    }

    let isMounted = true
    const viewSessionKey = getBoardViewSessionKey(location.key, postType, postId)
    const shouldIncrementViews = !hasRecordedBoardView(viewSessionKey)

    async function bootstrap() {
      setIsLoading(true)

      if (shouldIncrementViews) {
        recordBoardView(viewSessionKey)

        const viewResult = await incrementPostViews(postType, postId)

        if (!isMounted) {
          return
        }

        if (viewResult.success) {
          setStats({
            viewsCount: viewResult.stats.views_count ?? fallbackViews,
            likesCount: viewResult.stats.likes_count ?? 0,
            commentsCount: viewResult.stats.comments_count ?? 0,
          })
        } else {
          await refreshStats()
        }
      } else {
        await refreshStats()
      }

      if (isMounted) {
        setIsLoading(false)
      }
    }

    bootstrap()

    const unsubscribeMeta = subscribePostMeta(postType, postId, (nextStats) => {
      setStats({
        viewsCount: nextStats.views_count ?? fallbackViews,
        likesCount: nextStats.likes_count ?? 0,
        commentsCount: nextStats.comments_count ?? 0,
      })
    })

    const unsubscribeLikes = subscribePostLikes(postType, postId, () => {
      refreshStats()
    })

    return () => {
      isMounted = false
      unsubscribeMeta()
      unsubscribeLikes()
    }
  }, [fallbackViews, location.key, postId, postType, refreshStats])

  return {
    stats,
    likedByMe,
    setLikedByMe,
    isLoading,
    refreshStats,
    refreshLikeState,
  }
}
