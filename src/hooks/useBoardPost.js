import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { fetchBoardPost } from '@/services/board/posts'

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
