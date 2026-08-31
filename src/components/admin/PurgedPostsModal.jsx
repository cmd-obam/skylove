import { useCallback, useEffect, useState } from 'react'
import {
  fetchPurgedPostsForSuperAdmin,
  restorePurgedPostsForSuperAdmin,
  updatePurgedPostForSuperAdmin,
} from '@/services/admin/contentManagement'
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'

const STATUS_OPTIONS = [
  { value: 'public', label: '공개' },
  { value: 'private', label: '비공개' },
  { value: 'scheduled', label: '예약' },
]

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function PurgedPostEditModal({ post, onClose, onSaved }) {
  const [title, setTitle] = useState(post?.title ?? '')
  const [content, setContent] = useState(post?.content ?? '')
  const [status, setStatus] = useState(post?.status ?? 'public')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setTitle(post?.title ?? '')
    setContent(post?.content ?? '')
    setStatus(post?.status ?? 'public')
    setError('')
  }, [post])

  if (!post) {
    return null
  }

  const handleSave = async (restore) => {
    setError('')

    if (!String(title).trim()) {
      setError('제목을 입력해 주세요.')
      return
    }

    setSubmitting(true)
    const result = await updatePurgedPostForSuperAdmin({
      id: post.id,
      title: title.trim(),
      content,
      status,
      restore,
    })
    setSubmitting(false)

    if (!result.success) {
      setError(result.message)
      return
    }

    onSaved(restore ? '게시글이 수정되어 복원되었습니다.' : '게시글이 저장되었습니다.')
  }

  return (
    <div className="member-management-modal content-cms-purged-modal__overlay" role="presentation">
      <div
        className="member-management-modal__dialog content-cms-purged-modal__edit"
        role="dialog"
        aria-modal="true"
        aria-labelledby="purged-post-edit-title"
      >
        <h2 id="purged-post-edit-title" className="member-management-modal__title">
          영구삭제 게시글 수정
        </h2>
        <p className="content-cms-purged-modal__meta">
          {post.board_label} · {post.writer} · 영구삭제 {formatDateTime(post.purged_at)}
        </p>

        <div className="content-cms-purged-modal__field">
          <label htmlFor="purged-post-title" className="content-cms-purged-modal__label">
            제목
          </label>
          <input
            id="purged-post-title"
            type="text"
            className="content-cms-purged-modal__input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={submitting}
            autoComplete={AUTOCOMPLETE_OFF}
          />
        </div>

        <div className="content-cms-purged-modal__field">
          <label htmlFor="purged-post-status" className="content-cms-purged-modal__label">
            상태
          </label>
          <select
            id="purged-post-status"
            className="content-cms-purged-modal__input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            disabled={submitting}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="content-cms-purged-modal__field">
          <label htmlFor="purged-post-content" className="content-cms-purged-modal__label">
            내용
          </label>
          <textarea
            id="purged-post-content"
            className="content-cms-purged-modal__textarea"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={submitting}
            rows={12}
            autoComplete={AUTOCOMPLETE_OFF}
          />
        </div>

        {error ? (
          <p className="content-cms-purged-modal__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="member-management-modal__actions content-cms-purged-modal__actions">
          <button
            type="button"
            className="member-management-modal__button member-management-modal__button--secondary"
            onClick={onClose}
            disabled={submitting}
          >
            취소
          </button>
          <button
            type="button"
            className="member-management-modal__button member-management-modal__button--secondary"
            onClick={() => handleSave(false)}
            disabled={submitting}
          >
            {submitting ? '처리 중...' : '저장'}
          </button>
          <button
            type="button"
            className="member-management-modal__button member-management-modal__button--primary"
            onClick={() => handleSave(true)}
            disabled={submitting}
          >
            {submitting ? '처리 중...' : '저장 후 복원'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PurgedPostsModal({ isOpen, onClose, onFeedback, onChanged }) {
  const [posts, setPosts] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editPost, setEditPost] = useState(null)
  const [error, setError] = useState('')

  const loadPosts = useCallback(async () => {
    setLoading(true)
    setError('')

    const result = await fetchPurgedPostsForSuperAdmin({
      search: searchQuery,
      limit: 50,
      offset: 0,
    })

    setLoading(false)

    if (!result.success) {
      setPosts([])
      setTotalCount(0)
      setError(result.message)
      return
    }

    setPosts(result.posts)
    setTotalCount(result.totalCount)
    setSelectedIds([])
  }, [searchQuery])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    void loadPosts()
  }, [isOpen, loadPosts])

  if (!isOpen) {
    return null
  }

  const allSelected = posts.length > 0 && selectedIds.length === posts.length

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : posts.map((post) => post.id))
  }

  const toggleSelect = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const handleRestore = async (ids) => {
    if (ids.length === 0) {
      onFeedback({ type: 'error', message: '선택된 게시글이 없습니다.' })
      return
    }

    if (!window.confirm(`선택한 게시글 ${ids.length}개를 복원하시겠습니까?`)) {
      return
    }

    setIsSubmitting(true)
    const result = await restorePurgedPostsForSuperAdmin(ids)
    setIsSubmitting(false)

    if (!result.success) {
      onFeedback({ type: 'error', message: result.message })
      return
    }

    onFeedback({ type: 'success', message: '게시글이 복원되었습니다.' })
    onChanged?.()
    await loadPosts()
  }

  const handleEditSaved = async (message) => {
    setEditPost(null)
    onFeedback({ type: 'success', message })
    onChanged?.()
    await loadPosts()
  }

  return (
    <>
      <div className="member-management-modal content-cms-purged-modal" role="presentation">
        <div
          className="member-management-modal__dialog content-cms-purged-modal__dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="purged-posts-title"
        >
          <h2 id="purged-posts-title" className="member-management-modal__title">
            영구삭제 게시글 목록
          </h2>
          <p className="content-cms-purged-modal__intro">
            최고관리자만 볼 수 있는 영구삭제 보관 목록입니다. 수정·복원은 이 창에서만 가능합니다.
          </p>

          <form
            className="content-cms-purged-modal__search"
            onSubmit={(event) => {
              event.preventDefault()
              setSearchQuery(search.trim())
            }}
          >
            <input
              type="search"
              className="content-cms-purged-modal__input"
              value={search}
              onChange={(event) => setSearch(search.target.value)}
              placeholder="제목, 내용, 작성자, 게시판 검색"
              autoComplete={AUTOCOMPLETE_OFF}
            />
            <button type="submit" className="content-cms-purged-modal__search-button">
              검색
            </button>
          </form>

          <div className="content-cms-purged-modal__toolbar">
            <button type="button" onClick={toggleSelectAll} disabled={isSubmitting || posts.length === 0}>
              {allSelected ? '전체해제' : '전체선택'}
            </button>
            <button
              type="button"
              onClick={() => handleRestore(selectedIds)}
              disabled={isSubmitting || selectedIds.length === 0}
            >
              선택 복원
            </button>
            <span className="content-cms-purged-modal__count">{totalCount}건</span>
          </div>

          {error ? (
            <p className="content-cms-purged-modal__error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="content-cms-purged-modal__table-wrap">
            {loading ? (
              <p className="content-cms-purged-modal__empty">불러오는 중...</p>
            ) : posts.length === 0 ? (
              <p className="content-cms-purged-modal__empty">영구삭제된 게시글이 없습니다.</p>
            ) : (
              <table className="member-management-page__table content-cms-purged-modal__table">
                <thead>
                  <tr>
                    <th scope="col">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        aria-label="전체선택"
                      />
                    </th>
                    <th scope="col">게시판</th>
                    <th scope="col">제목</th>
                    <th scope="col">작성자</th>
                    <th scope="col">영구삭제일</th>
                    <th scope="col">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(post.id)}
                          onChange={() => toggleSelect(post.id)}
                          aria-label={`${post.title} 선택`}
                        />
                      </td>
                      <td>{post.board_label}</td>
                      <td className="content-cms-title-cell">{post.title}</td>
                      <td>{post.writer}</td>
                      <td>{formatDateTime(post.purged_at)}</td>
                      <td>
                        <div className="member-management-page__actions">
                          <button
                            type="button"
                            className="member-management-page__action-button"
                            onClick={() => setEditPost(post)}
                            disabled={isSubmitting}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            className="member-management-page__action-button"
                            onClick={() => handleRestore([post.id])}
                            disabled={isSubmitting}
                          >
                            복원
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="member-management-modal__actions">
            <button
              type="button"
              className="member-management-modal__button member-management-modal__button--secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              닫기
            </button>
          </div>
        </div>
      </div>

      {editPost ? (
        <PurgedPostEditModal
          post={editPost}
          onClose={() => setEditPost(null)}
          onSaved={handleEditSaved}
        />
      ) : null}
    </>
  )
}

export default PurgedPostsModal
