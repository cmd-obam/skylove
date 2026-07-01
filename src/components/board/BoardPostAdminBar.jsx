import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Modal from '@/components/common/Modal'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { deleteBoardPost } from '@/services/board/posts'

function BoardPostAdminBar({ postType, postId, listPath }) {
  const { isAdmin, loading } = useIsAdmin()
  const navigate = useNavigate()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (loading || !isAdmin) {
    return null
  }

  const editPath =
    postType === 'church_news' ? `/news/edit/${postId}` : `/album/edit/${postId}`

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

  return (
    <>
      <div className="board-post-admin-bar">
        <Link to={editPath} className="church-news-detail__header-button">
          수정
        </Link>
        <button
          type="button"
          className="church-news-detail__header-button church-news-detail__header-button--danger"
          onClick={() => setShowDeleteModal(true)}
        >
          삭제
        </button>
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
