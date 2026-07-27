import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Modal from '@/components/common/Modal'
import { useAuth } from '@/contexts/AuthContext'
import {
  canDeletePost,
  canEditPost,
  canHidePost,
} from '@/services/auth/roles'
import { deleteBoardPost, setBoardPostHidden } from '@/services/board/posts'
import { getBoardEditPath } from '@/utils/boardPaths'

function getEditPath(postType, postId) {
  return getBoardEditPath(postType, postId)
}

function BoardPostAdminBar({ postType, postId, listPath, post = null }) {
  const { profile, user, loading } = useAuth()
  const navigate = useNavigate()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hiding, setHiding] = useState(false)
  const [postStatus, setPostStatus] = useState(post?.status ?? 'public')

  const currentUserId = user?.id ?? null
  const postForPermission = post
    ? { ...post, postType: post.postType ?? post.post_type ?? postType }
    : { postType }
  const canEdit = canEditPost(profile, postForPermission, currentUserId)
  const canDelete = canDeletePost(profile, postForPermission, currentUserId)
  const canHide = canHidePost(profile, postForPermission, currentUserId)

  if (loading || (!canEdit && !canDelete && !canHide)) {
    return null
  }

  const editPath = getEditPath(postType, postId)
  const isHidden = postStatus === 'private'

  const handleDelete = async () => {
    setDeleting(true)

    const result = await deleteBoardPost(postType, postId)

    if (!result.success) {
      window.alert(result.message)
      setDeleting(false)
      return
    }

    setShowDeleteModal(false)
    navigate(listPath)
  }

  const handleToggleHide = async () => {
    setHiding(true)

    const nextHidden = !isHidden
    const result = await setBoardPostHidden(postType, postId, nextHidden)

    if (!result.success) {
      window.alert(result.message)
      setHiding(false)
      return
    }

    setPostStatus(nextHidden ? 'private' : 'public')
    setHiding(false)
  }

  return (
    <>
      <div className="board-post-admin-bar">
        {canEdit && (
          <Link to={editPath} className="church-news-detail__header-button">
            수정
          </Link>
        )}
        {canHide && (
          <button
            type="button"
            className="church-news-detail__header-button"
            onClick={handleToggleHide}
            disabled={hiding}
          >
            {isHidden ? '숨김 해제' : '숨김'}
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            className="church-news-detail__header-button church-news-detail__header-button--danger"
            onClick={() => setShowDeleteModal(true)}
          >
            삭제
          </button>
        )}
      </div>

      <Modal
        isOpen={showDeleteModal}
        title="삭제 확인"
        onClose={() => !deleting && setShowDeleteModal(false)}
      >
        <p className="board-delete-modal__message">삭제하시겠습니까?</p>
        <div className="board-write-form__actions board-delete-modal__actions">
          <button
            type="button"
            className="church-news-detail__list-button"
            onClick={() => setShowDeleteModal(false)}
            disabled={deleting}
          >
            취소
          </button>
          <button
            type="button"
            className="church-news-board__search-button board-write-form__submit"
            onClick={handleDelete}
            disabled={deleting}
          >
            삭제
          </button>
        </div>
      </Modal>
    </>
  )
}

export default BoardPostAdminBar
