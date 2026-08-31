import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiChevronDown, FiPlus, FiSearch } from 'react-icons/fi'
import PurgedPostsModal from '@/components/admin/PurgedPostsModal'
import MemberMypageLayout from '@/components/auth/MemberMypageLayout'
import { useSuperAdmin } from '@/hooks/useSuperAdmin'
import {
  bulkUpdateCommentsForSuperAdmin,
  bulkUpdatePostsForSuperAdmin,
  fetchAdminContentNote,
  fetchContentCommentsForSuperAdmin,
  fetchContentPostsForSuperAdmin,
  saveAdminContentNote,
} from '@/services/admin/contentManagement'
import {
  BOARD_POST_TYPES,
  getBoardEditPath,
  getCommentDeepLink,
  getMemberDetailPath,
  getBoardDetailPath,
  getBoardWritePath,
} from '@/utils/boardPaths'
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import '@/pages/MemberManagement.css'
import './ContentManagement.css'

const PAGE_SIZES = [20, 50, 100]

const POST_STATUS_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'notice', label: '공지' },
  { value: 'public', label: '공개' },
  { value: 'scheduled', label: '예약' },
  { value: 'private', label: '비공개' },
  { value: 'deleted', label: '삭제됨' },
]

const COMMENT_STATUS_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'public', label: '공개' },
  { value: 'private', label: '숨김' },
  { value: 'deleted', label: '삭제됨' },
]

const SEARCH_FIELDS = [
  { value: 'all', label: '전체' },
  { value: 'title', label: '제목' },
  { value: 'content', label: '내용' },
  { value: 'writer', label: '작성자' },
  { value: 'board', label: '게시판' },
  { value: 'comment', label: '댓글 내용' },
  { value: 'attachment', label: '첨부파일명' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: '최신순' },
  { value: 'oldest', label: '오래된순' },
  { value: 'views', label: '조회순' },
  { value: 'comments', label: '댓글순' },
  { value: 'likes', label: '추천순' },
  { value: 'writer', label: '작성자순' },
]

const PERIOD_OPTIONS = [
  { value: '', label: '전체 기간' },
  { value: 'today', label: '오늘' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: 'custom', label: '직접선택' },
]

function ConfirmModal({ isOpen, title, message, confirmLabel, isSubmitting, onCancel, onConfirm }) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="member-management-modal" role="presentation">
      <div className="member-management-modal__dialog" role="dialog" aria-modal="true">
        <h2 className="member-management-modal__title">{title}</h2>
        <p className="member-management-modal__message">{message}</p>
        <div className="member-management-modal__actions">
          <button
            type="button"
            className="member-management-modal__button member-management-modal__button--secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            취소
          </button>
          <button
            type="button"
            className="member-management-modal__button member-management-modal__button--primary"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function NoteModal({ isOpen, title, value, isSubmitting, onChange, onCancel, onSave }) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="member-management-modal" role="presentation">
      <div className="member-management-modal__dialog content-cms-note-dialog" role="dialog" aria-modal="true">
        <h2 className="member-management-modal__title">{title}</h2>
        <textarea
          className="content-cms-note-textarea"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={8}
          placeholder="관리자만 볼 수 있는 메모를 작성하세요."
          disabled={isSubmitting}
        />
        <div className="member-management-modal__actions">
          <button
            type="button"
            className="member-management-modal__button member-management-modal__button--secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            취소
          </button>
          <button
            type="button"
            className="member-management-modal__button member-management-modal__button--primary"
            onClick={onSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

function getPostStatusLabel(post) {
  if (post.deleted_at) {
    return '삭제됨'
  }

  if (post.status === 'scheduled') {
    return '예약'
  }

  if (post.is_notice) {
    return '공지'
  }

  return post.status === 'private' ? '비공개' : '공개'
}

function getCommentStatusLabel(comment) {
  if (comment.deleted_at) {
    return '삭제됨'
  }

  return comment.is_hidden ? '숨김' : '공개'
}

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

function ContentManagement() {
  const { isSuperAdmin } = useSuperAdmin()
  const [tab, setTab] = useState('posts')
  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmState, setConfirmState] = useState(null)
  const [noteState, setNoteState] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [draftFilters, setDraftFilters] = useState({
    search: '',
    searchField: 'all',
    postType: '',
    status: 'all',
    hasImage: false,
    hasAttachment: false,
    period: '',
    dateFrom: '',
    dateTo: '',
    sort: 'newest',
  })
  const [appliedFilters, setAppliedFilters] = useState(draftFilters)
  const [purgedModalOpen, setPurgedModalOpen] = useState(false)
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false)
  const [writeMenuOpen, setWriteMenuOpen] = useState(false)
  const writeMenuRef = useRef(null)

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const loadRows = useCallback(async () => {
    setLoading(true)
    setFeedback(null)

    const filters = {
      ...appliedFilters,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      dateFrom: appliedFilters.period === 'custom' ? appliedFilters.dateFrom : '',
      dateTo: appliedFilters.period === 'custom' ? appliedFilters.dateTo : '',
      period: appliedFilters.period === 'custom' ? '' : appliedFilters.period,
    }

    const result =
      tab === 'posts'
        ? await fetchContentPostsForSuperAdmin(filters)
        : await fetchContentCommentsForSuperAdmin(filters)

    if (!result.success) {
      setFeedback({ type: 'error', message: result.message })
      setRows([])
      setTotalCount(0)
      setLoading(false)
      return
    }

    setRows(tab === 'posts' ? result.posts : result.comments)
    setTotalCount(result.totalCount)
    setSelectedIds([])
    setLoading(false)
  }, [appliedFilters, page, pageSize, tab])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  useEffect(() => {
    if (!writeMenuOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (writeMenuRef.current && !writeMenuRef.current.contains(event.target)) {
        setWriteMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [writeMenuOpen])

  const allSelected = rows.length > 0 && selectedIds.length === rows.length

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
      return
    }

    setSelectedIds(rows.map((row) => row.id))
  }

  const toggleSelect = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const invertSelection = () => {
    const selected = new Set(selectedIds)
    setSelectedIds(rows.filter((row) => !selected.has(row.id)).map((row) => row.id))
  }

  const applySearch = (event) => {
    event.preventDefault()
    setPage(1)
    setAppliedFilters(draftFilters)
  }

  const runBulkAction = async (action) => {
    if (selectedIds.length === 0) {
      setFeedback({ type: 'error', message: '선택된 항목이 없습니다.' })
      return
    }

    if (action === 'delete' || action === 'trash') {
      setConfirmState({
        action: 'trash',
        title: '삭제 확인',
        confirmLabel: '삭제',
        message: `선택한 ${tab === 'posts' ? '게시글' : '댓글'} ${selectedIds.length}개를 삭제하시겠습니까?\n휴지통으로 이동되며 15일 후 자동 영구삭제됩니다.`,
      })
      return
    }

    if (action === 'purge' || action === 'hard_delete' || action === 'permanent_delete') {
      setConfirmState({
        action: 'purge',
        title: '영구삭제 확인',
        confirmLabel: '영구삭제',
        message: `선택한 ${tab === 'posts' ? '게시글' : '댓글'} ${selectedIds.length}개를 영구삭제하시겠습니까?\n삭제목록으로 이동되며 일반 목록에서는 보이지 않습니다. 최고관리자만 삭제목록에서 복원할 수 있습니다.`,
      })
      return
    }

    setIsSubmitting(true)
    const result =
      tab === 'posts'
        ? await bulkUpdatePostsForSuperAdmin(selectedIds, action)
        : await bulkUpdateCommentsForSuperAdmin(selectedIds, action)

    setIsSubmitting(false)

    if (!result.success) {
      setFeedback({ type: 'error', message: result.message })
      return
    }

    setFeedback({ type: 'success', message: '처리되었습니다.' })
    await loadRows()
  }

  const confirmBulkDelete = async () => {
    const action = confirmState?.action === 'purge' ? 'purge' : 'trash'
    setIsSubmitting(true)
    const result =
      tab === 'posts'
        ? await bulkUpdatePostsForSuperAdmin(selectedIds, action)
        : await bulkUpdateCommentsForSuperAdmin(selectedIds, action)

    setIsSubmitting(false)
    setConfirmState(null)

    if (!result.success) {
      setFeedback({ type: 'error', message: result.message })
      return
    }

    setFeedback({
      type: 'success',
      message: action === 'purge' ? '영구삭제되었습니다.' : '휴지통으로 이동했습니다.',
    })
    await loadRows()
  }

  const openNote = async (targetType, targetId, label) => {
    const result = await fetchAdminContentNote(targetType, targetId)

    if (!result.success) {
      setFeedback({ type: 'error', message: result.message })
      return
    }

    setNoteState({
      targetType,
      targetId,
      label,
      body: result.note?.body ?? '',
    })
  }

  const saveNote = async () => {
    if (!noteState) {
      return
    }

    setIsSubmitting(true)
    const result = await saveAdminContentNote(
      noteState.targetType,
      noteState.targetId,
      noteState.body,
    )
    setIsSubmitting(false)

    if (!result.success) {
      setFeedback({ type: 'error', message: result.message })
      return
    }

    setNoteState(null)
    setFeedback({ type: 'success', message: '메모가 저장되었습니다.' })
    await loadRows()
  }

  const statusOptions = tab === 'posts' ? POST_STATUS_OPTIONS : COMMENT_STATUS_OPTIONS

  const pageLabel = useMemo(
    () => `총 ${totalCount.toLocaleString()}건 | ${page}/${totalPages} 페이지`,
    [page, totalCount, totalPages],
  )

  return (
    <MemberMypageLayout>
      <div className="member-management-page content-cms-page">
        <div className="content-cms-topbar">
          <h1 className="content-cms-topbar__title">게시글 & 댓글 관리</h1>
          {tab === 'posts' ? (
            <div className="content-cms-topbar__write" ref={writeMenuRef}>
              <button
                type="button"
                className="content-cms-topbar__write-button"
                onClick={() => setWriteMenuOpen((current) => !current)}
                aria-expanded={writeMenuOpen}
                aria-haspopup="menu"
              >
                <FiPlus aria-hidden="true" />
                새 게시글 작성
                <FiChevronDown className="content-cms-topbar__write-chevron" aria-hidden="true" />
              </button>
              {writeMenuOpen ? (
                <div className="content-cms-topbar__write-menu" role="menu">
                  {BOARD_POST_TYPES.map((board) => (
                    <Link
                      key={board.id}
                      to={getBoardWritePath(board.id)}
                      className="content-cms-topbar__write-item"
                      role="menuitem"
                      onClick={() => setWriteMenuOpen(false)}
                    >
                      {board.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="content-cms-tabs content-cms-tabs--pill" role="tablist" aria-label="콘텐츠 관리 탭">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'posts'}
            className={`content-cms-tabs__button${tab === 'posts' ? ' is-active' : ''}`}
            onClick={() => {
              setTab('posts')
              setPage(1)
              setSelectedIds([])
            }}
          >
            게시글
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'comments'}
            className={`content-cms-tabs__button${tab === 'comments' ? ' is-active' : ''}`}
            onClick={() => {
              setTab('comments')
              setPage(1)
              setSelectedIds([])
            }}
          >
            댓글
          </button>
        </div>

        <form className="content-cms-search" onSubmit={applySearch} autoComplete="off">
          <div className="content-cms-search__main">
            <label className="content-cms-search__input-wrap">
              <FiSearch className="content-cms-search__icon" aria-hidden="true" />
              <input
                type="search"
                className="content-cms-search__input"
                placeholder="검색어 입력"
                value={draftFilters.search}
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, search: event.target.value }))
                }
                autoComplete={AUTOCOMPLETE_OFF}
              />
            </label>

            <button
              type="button"
              className={`content-cms-search__advanced${advancedSearchOpen ? ' is-open' : ''}`}
              onClick={() => setAdvancedSearchOpen((current) => !current)}
              aria-expanded={advancedSearchOpen}
            >
              상세 검색
              <FiChevronDown className="content-cms-search__advanced-icon" aria-hidden="true" />
            </button>

            <button type="submit" className="content-cms-search__submit">
              검색
            </button>

            <select
              className="content-cms-search__select"
              value={draftFilters.period}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, period: event.target.value }))
              }
              aria-label="기간"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {tab === 'posts' ? (
              <>
                <label className="content-cms-check">
                  <input
                    type="checkbox"
                    checked={draftFilters.hasImage}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        hasImage: event.target.checked,
                      }))
                    }
                  />
                  이미지 포함
                </label>
                <label className="content-cms-check">
                  <input
                    type="checkbox"
                    checked={draftFilters.hasAttachment}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        hasAttachment: event.target.checked,
                      }))
                    }
                  />
                  첨부파일 포함
                </label>
              </>
            ) : null}
          </div>

          {advancedSearchOpen ? (
            <div className="content-cms-search__panel">
              <select
                value={draftFilters.searchField}
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, searchField: event.target.value }))
                }
                aria-label="검색 조건"
              >
                {SEARCH_FIELDS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {tab === 'posts' ? (
                <select
                  value={draftFilters.postType}
                  onChange={(event) =>
                    setDraftFilters((current) => ({ ...current, postType: event.target.value }))
                  }
                  aria-label="게시판"
                >
                  <option value="">게시판 전체</option>
                  {BOARD_POST_TYPES.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.label}
                    </option>
                  ))}
                </select>
              ) : null}

              <select
                value={draftFilters.status}
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, status: event.target.value }))
                }
                aria-label="상태"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={draftFilters.sort}
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, sort: event.target.value }))
                }
                aria-label="정렬"
              >
                {SORT_OPTIONS.filter((option) =>
                  tab === 'comments'
                    ? !['views', 'comments', 'likes'].includes(option.value)
                    : true,
                ).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {draftFilters.period === 'custom' ? (
                <div className="content-cms-search__dates">
                  <input
                    type="date"
                    value={draftFilters.dateFrom}
                    onChange={(event) =>
                      setDraftFilters((current) => ({ ...current, dateFrom: event.target.value }))
                    }
                    aria-label="시작일"
                  />
                  <span>~</span>
                  <input
                    type="date"
                    value={draftFilters.dateTo}
                    onChange={(event) =>
                      setDraftFilters((current) => ({ ...current, dateTo: event.target.value }))
                    }
                    aria-label="종료일"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </form>

        <div className="content-cms-actions">
          <div className="content-cms-actions__bulk">
            <button type="button" onClick={toggleSelectAll}>
              {allSelected ? '전체해제' : '전체선택'}
            </button>
            <button type="button" onClick={invertSelection}>
              역선택
            </button>
            <button type="button" onClick={() => runBulkAction('public')} disabled={isSubmitting}>
              선택공개
            </button>
            <button type="button" onClick={() => runBulkAction('hide')} disabled={isSubmitting}>
              선택숨김
            </button>
            <button type="button" onClick={() => runBulkAction('restore')} disabled={isSubmitting}>
              선택복구
            </button>
            {isSuperAdmin && tab === 'posts' ? (
              <>
                <button
                  type="button"
                  className="is-danger"
                  onClick={() => runBulkAction('purge')}
                  disabled={isSubmitting}
                >
                  영구삭제
                </button>
                <button
                  type="button"
                  className="content-cms-actions__purge-list"
                  onClick={() => setPurgedModalOpen(true)}
                  disabled={isSubmitting}
                >
                  삭제목록
                </button>
              </>
            ) : null}
          </div>

          <div className="content-cms-actions__meta">
            <button
              type="button"
              className="content-cms-actions__delete"
              onClick={() => runBulkAction('trash')}
              disabled={isSubmitting}
            >
              선택 삭제
            </button>

            <div className="content-cms-actions__pager" aria-label="페이지 이동">
              <button
                type="button"
                className="content-cms-actions__pager-button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                aria-label="이전 페이지"
              >
                ‹
              </button>
              <span className="content-cms-actions__pager-current">{page}</span>
              <button
                type="button"
                className="content-cms-actions__pager-button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                aria-label="다음 페이지"
              >
                ›
              </button>
            </div>

            <span className="content-cms-actions__count">{pageLabel}</span>

            <select
              className="content-cms-actions__page-size"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value))
                setPage(1)
              }}
              aria-label="페이지당 개수"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}개 보기
                </option>
              ))}
            </select>
          </div>
        </div>

        {feedback ? (
          <p
            className={`member-management-page__feedback member-management-page__feedback--${feedback.type}`}
            role={feedback.type === 'error' ? 'alert' : 'status'}
          >
            {feedback.message}
          </p>
        ) : null}

        <div className="member-management-page__table-wrap content-cms-table-wrap">
          {tab === 'posts' ? (
            <table className="member-management-page__table content-cms-table">
              <thead>
                <tr>
                  <th scope="col">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} aria-label="전체선택" />
                  </th>
                  <th scope="col">번호</th>
                  <th scope="col">게시판</th>
                  <th scope="col">제목</th>
                  <th scope="col">이미지</th>
                  <th scope="col">작성자</th>
                  <th scope="col">작성일</th>
                  <th scope="col">수정일</th>
                  <th scope="col">조회</th>
                  <th scope="col">댓글</th>
                  <th scope="col">추천</th>
                  <th scope="col">상태</th>
                  <th scope="col">관리</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} className="member-management-page__empty">
                      불러오는 중...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="member-management-page__empty">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((post, index) => {
                    const rowNumber = totalCount - ((page - 1) * pageSize + index)
                    return (
                      <tr key={post.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(post.id)}
                            onChange={() => toggleSelect(post.id)}
                            aria-label={`${post.title} 선택`}
                          />
                        </td>
                        <td>{rowNumber}</td>
                        <td>{post.board_label}</td>
                        <td className="content-cms-title-cell">
                          <Link to={getBoardDetailPath(post.post_type, post.id)}>{post.title}</Link>
                          {post.has_admin_note ? <span className="content-cms-note-dot" title="관리자 메모" /> : null}
                        </td>
                        <td>
                          {post.thumbnail ? (
                            <img src={post.thumbnail} alt="" className="content-cms-thumb" />
                          ) : post.has_image ? (
                            <span aria-hidden="true">🖼</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          {post.author_id ? (
                            <Link to={getMemberDetailPath(post.author_id)}>{post.writer}</Link>
                          ) : (
                            post.writer
                          )}
                        </td>
                        <td>{formatDateTime(post.created_at)}</td>
                        <td>
                          {post.updated_at && post.updated_at !== post.created_at
                            ? formatDateTime(post.updated_at)
                            : '-'}
                        </td>
                        <td>{post.views_count}</td>
                        <td>{post.comments_count}</td>
                        <td>{post.likes_count}</td>
                        <td>
                          <div className="content-cms-status-cell">
                            <span className={`content-cms-status content-cms-status--${getPostStatusLabel(post)}`}>
                              {getPostStatusLabel(post)}
                            </span>
                            {post.status === 'scheduled' && post.scheduled_at ? (
                              <span className="content-cms-schedule-time">
                                {formatDateTime(post.scheduled_at)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <div className="member-management-page__actions">
                            <Link
                              to={getBoardEditPath(post.post_type, post.id)}
                              className="member-management-page__action-button"
                            >
                              수정
                            </Link>
                            <button
                              type="button"
                              className="member-management-page__action-button"
                              onClick={() => openNote('post', post.id, post.title)}
                            >
                              메모
                            </button>
                            <button
                              type="button"
                              className="member-management-page__action-button member-management-page__action-button--danger"
                              onClick={() => {
                                setSelectedIds([post.id])
                                setConfirmState({
                                  action: 'trash',
                                  message: `「${post.title}」 게시글을 삭제하시겠습니까?\n휴지통으로 이동되며 15일 후 자동 영구삭제됩니다.`,
                                })
                              }}
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="member-management-page__table content-cms-table">
              <thead>
                <tr>
                  <th scope="col">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} aria-label="전체선택" />
                  </th>
                  <th scope="col">번호</th>
                  <th scope="col">댓글 내용</th>
                  <th scope="col">원본 게시글</th>
                  <th scope="col">게시판</th>
                  <th scope="col">작성자</th>
                  <th scope="col">작성일</th>
                  <th scope="col">수정일</th>
                  <th scope="col">상태</th>
                  <th scope="col">관리</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="member-management-page__empty">
                      불러오는 중...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="member-management-page__empty">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((comment, index) => {
                    const rowNumber = totalCount - ((page - 1) * pageSize + index)
                    return (
                      <tr key={comment.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(comment.id)}
                            onChange={() => toggleSelect(comment.id)}
                            aria-label="댓글 선택"
                          />
                        </td>
                        <td>{rowNumber}</td>
                        <td className="content-cms-title-cell">
                          <Link to={getCommentDeepLink(comment.post_type, comment.post_id, comment.id)}>
                            {comment.body}
                          </Link>
                          {comment.has_admin_note ? (
                            <span className="content-cms-note-dot" title="관리자 메모" />
                          ) : null}
                        </td>
                        <td>
                          <Link to={getBoardDetailPath(comment.post_type, comment.post_id)}>
                            {comment.post_title}
                          </Link>
                        </td>
                        <td>{comment.board_label}</td>
                        <td>
                          {comment.user_id ? (
                            <Link to={getMemberDetailPath(comment.user_id)}>{comment.author_name}</Link>
                          ) : (
                            comment.author_name
                          )}
                        </td>
                        <td>{formatDateTime(comment.created_at)}</td>
                        <td>
                          {comment.updated_at && comment.updated_at !== comment.created_at
                            ? formatDateTime(comment.updated_at)
                            : '-'}
                        </td>
                        <td>
                          <span
                            className={`content-cms-status content-cms-status--${getCommentStatusLabel(comment)}`}
                          >
                            {getCommentStatusLabel(comment)}
                          </span>
                        </td>
                        <td>
                          <div className="member-management-page__actions">
                            <button
                              type="button"
                              className="member-management-page__action-button"
                              onClick={() => openNote('comment', comment.id, comment.body.slice(0, 40))}
                            >
                              메모
                            </button>
                            <button
                              type="button"
                              className="member-management-page__action-button member-management-page__action-button--danger"
                              onClick={() => {
                                setSelectedIds([comment.id])
                                setConfirmState({
                                  action: 'trash',
                                  message: `선택한 댓글 1개를 삭제하시겠습니까?\n휴지통으로 이동되며 15일 후 자동 영구삭제됩니다.`,
                                })
                              }}
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="content-cms-cards" aria-hidden={false}>
          {loading ? (
            <p className="member-management-page__empty">불러오는 중...</p>
          ) : rows.length === 0 ? (
            <p className="member-management-page__empty">검색 결과가 없습니다.</p>
          ) : tab === 'posts' ? (
            rows.map((post, index) => (
              <article key={post.id} className="content-cms-card">
                <label className="content-cms-card__check">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(post.id)}
                    onChange={() => toggleSelect(post.id)}
                  />
                  <span>#{totalCount - ((page - 1) * pageSize + index)}</span>
                </label>
                <p className="content-cms-card__meta">
                  {post.board_label} · {getPostStatusLabel(post)}
                </p>
                <Link className="content-cms-card__title" to={getBoardDetailPath(post.post_type, post.id)}>
                  {post.title}
                </Link>
                <p className="content-cms-card__meta">
                  {post.writer} · {formatDateTime(post.created_at)}
                </p>
                <p className="content-cms-card__meta">
                  조회 {post.views_count} · 댓글 {post.comments_count} · 추천 {post.likes_count}
                </p>
              </article>
            ))
          ) : (
            rows.map((comment, index) => (
              <article key={comment.id} className="content-cms-card">
                <label className="content-cms-card__check">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(comment.id)}
                    onChange={() => toggleSelect(comment.id)}
                  />
                  <span>#{totalCount - ((page - 1) * pageSize + index)}</span>
                </label>
                <Link
                  className="content-cms-card__title"
                  to={getCommentDeepLink(comment.post_type, comment.post_id, comment.id)}
                >
                  {comment.body}
                </Link>
                <p className="content-cms-card__meta">
                  {comment.board_label} · {comment.post_title}
                </p>
                <p className="content-cms-card__meta">
                  {comment.author_name} · {formatDateTime(comment.created_at)} ·{' '}
                  {getCommentStatusLabel(comment)}
                </p>
              </article>
            ))
          )}
        </div>

        <ConfirmModal
          isOpen={Boolean(confirmState)}
          title={confirmState?.title ?? '삭제 확인'}
          message={confirmState?.message ?? ''}
          confirmLabel={confirmState?.confirmLabel ?? '삭제'}
          isSubmitting={isSubmitting}
          onCancel={() => {
            if (!isSubmitting) {
              setConfirmState(null)
            }
          }}
          onConfirm={confirmBulkDelete}
        />

        <NoteModal
          isOpen={Boolean(noteState)}
          title={`관리자 메모 · ${noteState?.label ?? ''}`}
          value={noteState?.body ?? ''}
          isSubmitting={isSubmitting}
          onChange={(body) => setNoteState((current) => (current ? { ...current, body } : current))}
          onCancel={() => {
            if (!isSubmitting) {
              setNoteState(null)
            }
          }}
          onSave={saveNote}
        />

        <PurgedPostsModal
          isOpen={purgedModalOpen}
          onClose={() => setPurgedModalOpen(false)}
          onFeedback={setFeedback}
          onChanged={loadRows}
        />
      </div>
    </MemberMypageLayout>
  )
}

export default ContentManagement
