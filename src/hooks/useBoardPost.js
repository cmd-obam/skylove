import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { fetchBoardPost } from '@/services/board/posts'
import { getBoardPostCanonicalPath } from '@/utils/boardPostRef'

export function useBoardPost(postType, postId) {
  const { isLoggedIn, loading: authLoading } = useAuth()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (authLoading) {
      setLoading(true)
      return
    }

    if (!postId || !isLoggedIn) {
      setPost(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setPost(null)
    setError(null)

    const result = await fetchBoardPost(postType, postId)

    if (result.success) {
      setPost(result.post)
    } else if (result.notFound) {
      setPost(null)
    } else {
      setError(result.message)
      setPost(null)
    }

    setLoading(false)
  }, [authLoading, isLoggedIn, postId, postType])

  useEffect(() => {
    reload()
  }, [reload])

  return { post, loading: loading || authLoading, error, reload }
}

export function useBoardPostRoute(postType) {
  const { postId } = useParams()
  const state = useBoardPost(postType, postId)
  const canonicalPath = state.loading
    ? null
    : getBoardPostCanonicalPath(state.post, postId, { routePostType: postType })

  return { ...state, routePostId: postId, canonicalPath }
}
