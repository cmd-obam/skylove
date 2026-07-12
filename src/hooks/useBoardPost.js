import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchBoardPost } from '@/services/board/posts'

export function useBoardPost(postType, postId) {
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [canFetch, setCanFetch] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function verifyAccess() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      setCanFetch(Boolean(session?.user))
    }

    verifyAccess()

    return () => {
      isMounted = false
    }
  }, [])

  const reload = useCallback(async () => {
    if (!postId || !canFetch) {
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
  }, [canFetch, postId, postType])

  useEffect(() => {
    reload()
  }, [reload])

  return { post, loading, error, reload }
}
