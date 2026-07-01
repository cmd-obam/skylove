import { useCallback, useEffect, useState } from 'react'
import { fetchBoardPost } from '@/services/board/posts'

export function useBoardPost(postType, postId) {
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!postId) {
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
  }, [postId, postType])

  useEffect(() => {
    reload()
  }, [reload])

  return { post, loading, error, reload }
}
