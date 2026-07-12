import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchCommentCountsMap, subscribeCommentCounts } from '@/services/board/comments'
import { fetchBoardPosts } from '@/services/board/posts'

export function useBoardPostList(postType) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const postsRef = useRef(posts)

  postsRef.current = posts

  const refreshCommentCounts = useCallback(async () => {
    const postIds = postsRef.current.map((post) => post.id)

    if (postIds.length === 0) {
      return
    }

    const commentCounts = await fetchCommentCountsMap(postType, postIds)

    setPosts((currentPosts) =>
      currentPosts.map((post) => ({
        ...post,
        commentsCount: commentCounts[String(post.id)] ?? 0,
      })),
    )
  }, [postType])

  useEffect(() => {
    let isMounted = true

    async function loadPosts() {
      setLoading(true)

      const result = await fetchBoardPosts(postType)

      if (isMounted) {
        setPosts(result.posts ?? [])
        setLoading(false)
      }
    }

    loadPosts()

    return () => {
      isMounted = false
    }
  }, [postType])

  useEffect(() => {
    const unsubscribe = subscribeCommentCounts(postType, () => {
      refreshCommentCounts()
    })

    return unsubscribe
  }, [postType, refreshCommentCounts])

  return { posts, loading }
}
