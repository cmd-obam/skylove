import { useCallback, useEffect, useState } from 'react'
import { FiHeart } from 'react-icons/fi'
import { useAuth } from '@/contexts/AuthContext'
import { useBoardComments } from '@/hooks/useBoardComments'
import { isAdminRole } from '@/services/auth/roles'
import { formatCommentDateTime } from '@/utils/formatBoardDate'
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'

/** 댓글 작성자 user_id === 현재 로그인 auth.uid() */
function isOwnComment(comment, currentUserId) {
  return Boolean(currentUserId && comment?.userId && comment.userId === currentUserId)
}

function canEditComment(comment, currentUserId, isBoardAdmin) {
  return isBoardAdmin || isOwnComment(comment, currentUserId)
}

function canDeleteComment(comment, currentUserId, isBoardAdmin) {
  return isBoardAdmin || isOwnComment(comment, currentUserId)
}

function CommentActions({
  comment,
  isEditing,
  canEdit,
  canDelete,
  canModerate,
  onDelete,
  onHide,
  onPin,
  onResolveReport,
  onEdit,
}) {
  if (!canEdit && !canDelete && !canModerate) {
    return null
  }

  return (
    <div className="board-comments__admin-actions">
      {canModerate && (
        <button type="button" className="board-comments__admin-button" onClick={() => onHide(comment)}>
          {comment.isHidden ? '숨김 해제' : '숨김'}
        </button>
      )}
      {canDelete && (
        <button type="button" className="board-comments__admin-button" onClick={() => onDelete(comment.id)}>
          삭제
        </button>
      )}
      {canEdit && !isEditing && (
        <button type="button" className="board-comments__admin-button" onClick={() => onEdit(comment)}>
          수정
        </button>
      )}
      {canModerate && (
        <button type="button" className="board-comments__admin-button" onClick={() => onPin(comment)}>
          {comment.isPinned ? '고정 해제' : '고정'}
        </button>
      )}
      {canModerate && comment.isReported && (
        <button
          type="button"
          className="board-comments__admin-button"
          onClick={() => onResolveReport(comment.id)}
        >
          신고 처리
        </button>
      )}
    </div>
  )
}

function CommentItem({
  comment,
  isLoggedIn,
  isBoardAdmin,
  currentUserId,
  isEditing,
  editBody,
  onEditBodyChange,
  onEditSave,
  onEditCancel,
  onLike,
  onDelete,
  onHide,
  onPin,
  onResolveReport,
  onEdit,
}) {
  if (comment.isHidden && !isBoardAdmin) {
    return null
  }

  const canEdit = canEditComment(comment, currentUserId, isBoardAdmin)
  const canDelete = canDeleteComment(comment, currentUserId, isBoardAdmin)
  const canModerate = isBoardAdmin

  return (
    <article
      id={`comment-${comment.id}`}
      className={`board-comments__item${comment.isHidden ? ' board-comments__item--hidden' : ''}${
        comment.isPinned ? ' board-comments__item--pinned' : ''
      }${isEditing ? ' board-comments__item--editing' : ''}`}
    >
      <div className="board-comments__item-header">
        <div className="board-comments__item-meta">
          <strong className="board-comments__author">{comment.authorName}</strong>
          <time className="board-comments__date" dateTime={comment.createdAt}>
            {formatCommentDateTime(comment.createdAt)}
          </time>
          {comment.isPinned && <span className="board-comments__badge">고정</span>}
          {comment.isHidden && isBoardAdmin && <span className="board-comments__badge">숨김</span>}
          {comment.isReported && isBoardAdmin && (
            <span className="board-comments__badge board-comments__badge--report">신고</span>
          )}
        </div>
        <CommentActions
          comment={comment}
          isEditing={isEditing}
          canEdit={canEdit}
          canDelete={canDelete}
          canModerate={canModerate}
          onDelete={onDelete}
          onHide={onHide}
          onPin={onPin}
          onResolveReport={onResolveReport}
          onEdit={onEdit}
        />
      </div>

      {isEditing ? (
        <div className="board-comments__edit-panel">
          <textarea
            className="board-post-extras__comment-input"
            rows={3}
            value={editBody}
            onChange={(event) => onEditBodyChange(event.target.value)}
            autoComplete={AUTOCOMPLETE_OFF}
            aria-label="댓글 수정"
          />
          <div className="board-comments__edit-actions">
            <button type="button" className="board-comments__edit-button" onClick={onEditSave}>
              저장
            </button>
            <button
              type="button"
              className="board-comments__edit-button board-comments__edit-button--secondary"
              onClick={onEditCancel}
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="board-comments__body">{comment.body}</p>

          <button
            type="button"
            className={`board-comments__like-button${comment.likedByMe ? ' board-comments__like-button--active' : ''}`}
            onClick={() => onLike(comment)}
            disabled={!isLoggedIn}
          >
            <FiHeart aria-hidden="true" />
            <span>추천 {comment.likeCount}</span>
          </button>
        </>
      )}
    </article>
  )
}

function BoardPostComments({ postType, postId, onCommentsCountChange }) {
  const { isLoggedIn, user, profile } = useAuth()
  const [comment, setComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editBody, setEditBody] = useState('')

  const currentUserId = user?.id ?? null
  const isBoardAdmin = isAdminRole(profile?.role)

  const handleCommentsChange = useCallback(
    (count) => {
      onCommentsCountChange?.(count)
    },
    [onCommentsCountChange],
  )

  const {
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
  } = useBoardComments(postType, postId, currentUserId, handleCommentsChange)

  useEffect(() => {
    if (!feedback) {
      return undefined
    }

    const timer = window.setTimeout(() => setFeedback(null), 3000)
    return () => window.clearTimeout(timer)
  }, [feedback, setFeedback])

  useEffect(() => {
    const hash = window.location.hash
    const match = hash.match(/^#comment-(.+)$/)

    if (!match || comments.length === 0) {
      return undefined
    }

    const commentId = match[1]
    const element = document.getElementById(`comment-${commentId}`)

    if (!element) {
      return undefined
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    element.classList.add('board-comments__item--highlight')

    const timer = window.setTimeout(() => {
      element.classList.remove('board-comments__item--highlight')
    }, 2500)

    return () => {
      window.clearTimeout(timer)
      element.classList.remove('board-comments__item--highlight')
    }
  }, [comments])

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      setFeedback({ type: 'error', message: '로그인 후 댓글을 작성할 수 있습니다.' })
      return
    }

    const result = await submitComment({
      authorName: profile?.name || '회원',
      body: comment,
    })

    if (result.success) {
      setComment('')
    }
  }

  const handleFormSubmit = (event) => {
    event.preventDefault()
    handleSubmit()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  const handleLike = async (targetComment) => {
    if (!isLoggedIn) {
      setFeedback({ type: 'error', message: '로그인 후 추천할 수 있습니다.' })
      return
    }

    await likeComment(targetComment.id, targetComment.likedByMe)
  }

  const handleHide = async (targetComment) => {
    if (!isBoardAdmin) {
      setFeedback({ type: 'error', message: '관리자만 댓글을 숨길 수 있습니다.' })
      return
    }

    await hideComment(targetComment.id, !targetComment.isHidden)
  }

  const handlePin = async (targetComment) => {
    if (!isBoardAdmin) {
      setFeedback({ type: 'error', message: '관리자만 댓글을 고정할 수 있습니다.' })
      return
    }

    await pinComment(targetComment.id, !targetComment.isPinned)
  }

  const handleResolveReport = async (commentId) => {
    if (!isBoardAdmin) {
      setFeedback({ type: 'error', message: '관리자만 신고를 처리할 수 있습니다.' })
      return
    }

    await handleReport(commentId)
  }

  const handleEditStart = (targetComment) => {
    if (!canEditComment(targetComment, currentUserId, isBoardAdmin)) {
      setFeedback({ type: 'error', message: '본인이 작성한 댓글만 수정할 수 있습니다.' })
      return
    }

    setEditingCommentId(targetComment.id)
    setEditBody(targetComment.body)
  }

  const handleEditCancel = () => {
    setEditingCommentId(null)
    setEditBody('')
  }

  const handleEditSave = async () => {
    if (!editingCommentId) {
      return
    }

    const targetComment = comments.find((item) => item.id === editingCommentId)

    if (!targetComment || !canEditComment(targetComment, currentUserId, isBoardAdmin)) {
      setFeedback({ type: 'error', message: '본인이 작성한 댓글만 수정할 수 있습니다.' })
      handleEditCancel()
      return
    }

    const result = await editComment(editingCommentId, editBody)

    if (result.success) {
      handleEditCancel()
    }
  }

  const handleDelete = async (commentId) => {
    const targetComment = comments.find((item) => item.id === commentId)

    if (!targetComment || !canDeleteComment(targetComment, currentUserId, isBoardAdmin)) {
      setFeedback({ type: 'error', message: '본인이 작성한 댓글만 삭제할 수 있습니다.' })
      return
    }

    if (!window.confirm('댓글을 삭제하시겠습니까?')) {
      return
    }

    if (editingCommentId === commentId) {
      handleEditCancel()
    }

    await removeComment(commentId)
  }

  return (
    <div className="board-post-extras__section board-post-extras__section--comments" id="board-post-comments">
      <h3 className="board-post-extras__label">댓글</h3>
      <div className="board-post-extras__content board-post-extras__content--comments">
        {feedback && (
          <p
            className={`board-comments__feedback board-comments__feedback--${feedback.type}`}
            role="status"
          >
            {feedback.message}
          </p>
        )}

        <div className="board-comments__list" aria-live="polite">
          {isLoading ? (
            <p className="board-post-extras__empty">댓글을 불러오는 중입니다.</p>
          ) : comments.length > 0 ? (
            comments.map((item) => (
              <CommentItem
                key={item.id}
                comment={item}
                isLoggedIn={isLoggedIn}
                isBoardAdmin={isBoardAdmin}
                currentUserId={currentUserId}
                isEditing={editingCommentId === item.id}
                editBody={editBody}
                onEditBodyChange={setEditBody}
                onEditSave={handleEditSave}
                onEditCancel={handleEditCancel}
                onLike={handleLike}
                onDelete={handleDelete}
                onHide={handleHide}
                onPin={handlePin}
                onResolveReport={handleResolveReport}
                onEdit={handleEditStart}
              />
            ))
          ) : (
            <p className="board-post-extras__empty">등록된 댓글이 없습니다.</p>
          )}
        </div>

        <form className="board-post-extras__comment-form" onSubmit={handleFormSubmit} autoComplete="off">
          <textarea
            id="board-post-comment"
            className="board-post-extras__comment-input"
            rows={4}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isLoggedIn ? '댓글 입력...' : '댓글은 로그인 후 작성 가능합니다.'
            }
            disabled={!isLoggedIn || isSubmitting}
            autoComplete={AUTOCOMPLETE_OFF}
          />
          <button
            type="submit"
            className="board-post-extras__comment-submit"
            disabled={!isLoggedIn || isSubmitting}
          >
            {isSubmitting ? '등록 중...' : '등록'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default BoardPostComments
