import { useCallback, useEffect, useState } from 'react'
import {
  createComment,
  deleteComment,
  fetchComments,
  resolveCommentReport,
  setCommentHidden,
  setCommentPinned,
  subscribeComments,
  toggleCommentLike,
  updateCommentBody,
} from '@/services/board/comments'

export function useBoardComments(postType, postId, userId, onCommentsChange) {
  const [comments, setComments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [feedback, setFeedback] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadComments = useCallback(async () => {
    const result = await fetchComments(postType, postId, userId)

    if (result.success) {
      setComments(result.comments)
      onCommentsChange?.(result.comments.length)
    }

    return result
  }, [onCommentsChange, postId, postType, userId])

  useEffect(() => {
    if (!postType || postId == null || postId === '') {
      setIsLoading(false)
      return undefined
    }

    let isMounted = true

    async function bootstrap() {
      setIsLoading(true)
      await loadComments()

      if (isMounted) {
        setIsLoading(false)
      }
    }

    bootstrap()

    const unsubscribe = subscribeComments(postType, postId, () => {
      loadComments()
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [loadComments, postId, postType])

  const submitComment = useCallback(
    async ({ authorName, body }) => {
      setIsSubmitting(true)
      setFeedback(null)

      const result = await createComment({
        postType,
        postId,
        userId,
        authorName,
        body,
      })

      setIsSubmitting(false)

      if (result.success) {
        setFeedback({ type: 'success', message: result.message })
        await loadComments()
      } else {
        setFeedback({ type: 'error', message: result.message })
      }

      return result
    },
    [loadComments, postId, postType, userId],
  )

  const editComment = useCallback(
    async (commentId, body) => {
      setFeedback(null)
      const result = await updateCommentBody(commentId, body)

      if (result.success) {
        setFeedback({ type: 'success', message: result.message })
        await loadComments()
      } else {
        setFeedback({ type: 'error', message: result.message })
      }

      return result
    },
    [loadComments],
  )

  const hideComment = useCallback(
    async (commentId, isHidden) => {
      setFeedback(null)
      const result = await setCommentHidden(commentId, isHidden)

      if (result.success) {
        setFeedback({ type: 'success', message: result.message })
        await loadComments()
      } else {
        setFeedback({ type: 'error', message: result.message })
      }

      return result
    },
    [loadComments],
  )

  const pinComment = useCallback(
    async (commentId, isPinned) => {
      setFeedback(null)
      const result = await setCommentPinned(commentId, isPinned)

      if (result.success) {
        setFeedback({ type: 'success', message: result.message })
        await loadComments()
      } else {
        setFeedback({ type: 'error', message: result.message })
      }

      return result
    },
    [loadComments],
  )

  const handleReport = useCallback(
    async (commentId) => {
      setFeedback(null)
      const result = await resolveCommentReport(commentId)

      if (result.success) {
        setFeedback({ type: 'success', message: result.message })
        await loadComments()
      } else {
        setFeedback({ type: 'error', message: result.message })
      }

      return result
    },
    [loadComments],
  )

  const removeComment = useCallback(
    async (commentId) => {
      setFeedback(null)
      const result = await deleteComment(commentId)

      if (result.success) {
        setFeedback({ type: 'success', message: result.message })
        await loadComments()
      } else {
        setFeedback({ type: 'error', message: result.message })
      }

      return result
    },
    [loadComments],
  )

  const likeComment = useCallback(
    async (commentId, liked) => {
      const result = await toggleCommentLike({ commentId, userId, liked })

      if (result.success) {
        await loadComments()
      } else {
        setFeedback({ type: 'error', message: result.message })
      }

      return result
    },
    [loadComments, userId],
  )

  return {
    comments,
    isLoading,
    isSubmitting,
    feedback,
    setFeedback,
    submitComment,
    editComment,
    hideComment,
    pinComment,
    handleReport,
    removeComment,
    likeComment,
    reloadComments: loadComments,
  }
}
