import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BoardPageHeader from '@/components/board/BoardPageHeader'
import SundayBulletin from '@/components/churchNews/SundayBulletin'
import { useAuth } from '@/contexts/AuthContext'
import { useUnsavedLeaveGuard } from '@/hooks/useUnsavedLeaveGuard'
import { SUNDAY_BULLETIN_WEEKLY_FIELDS } from '@/data/sundayBulletinFixed'
import { canEditPost } from '@/services/auth/roles'
import {
  createBoardPost,
  fetchBoardPost,
  updateBoardPost,
} from '@/services/board/posts'
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import {
  createEmptySundayBulletinWeekly,
  isSundayBulletinWeeklyEmpty,
  parseSundayBulletinWeekly,
  serializeSundayBulletinWeekly,
} from '@/utils/sundayBulletin'
import '@/pages/ChurchNews.css'
import '@/pages/MemberManagement.css'
import './SundayBulletinForm.css'

function SundayBulletinWritePage({
  pageTitle = '교회소식',
  formTitle = '주일예배 주보 작성',
  listPath = '/church-news',
  detailPathPrefix = '/church-news',
  mode = 'create',
  postId = null,
}) {
  const navigate = useNavigate()
  const { profile, user, effectiveUserId } = useAuth()
  const currentUserId = effectiveUserId ?? user?.id
  const isEdit = mode === 'edit'

  const [title, setTitle] = useState('')
  const [weekly, setWeekly] = useState(() => createEmptySundayBulletinWeekly())
  const [loadingPost, setLoadingPost] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [initialSnapshot, setInitialSnapshot] = useState(
    JSON.stringify({
      title: '',
      weekly: createEmptySundayBulletinWeekly(),
    }),
  )

  const currentSnapshot = useMemo(
    () => JSON.stringify({ title, weekly }),
    [title, weekly],
  )

  const isDirty = !loadingPost && currentSnapshot !== initialSnapshot

  const {
    isLeaveModalOpen,
    cancelLeave,
    confirmLeave,
    allowNavigation,
    requestNavigation,
  } = useUnsavedLeaveGuard({
    isDirty,
  })

  useEffect(() => {
    if (!isEdit || !postId) {
      return undefined
    }

    let isMounted = true

    async function loadPost() {
      const result = await fetchBoardPost('church_news', postId)

      if (!isMounted) {
        return
      }

      if (!result.success || !result.post) {
        setError(result.message || '게시글을 불러올 수 없습니다.')
        setLoadingPost(false)
        return
      }

      if (!canEditPost(profile, result.post, currentUserId)) {
        setError('이 게시글을 수정할 권한이 없습니다.')
        setLoadingPost(false)
        return
      }

      const parsed = parseSundayBulletinWeekly(result.post.content)
      if (!parsed) {
        setError('이 글은 주보 서식이 아닙니다. 일반 수정 화면을 이용해 주세요.')
        setLoadingPost(false)
        return
      }

      setTitle(result.post.title || '')
      setWeekly(parsed)
      setInitialSnapshot(
        JSON.stringify({
          title: result.post.title || '',
          weekly: parsed,
        }),
      )
      setLoadingPost(false)
    }

    loadPost()

    return () => {
      isMounted = false
    }
  }, [currentUserId, isEdit, postId, profile])

  const handleFieldChange = (key, value) => {
    setWeekly((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const trimmedTitle = title.trim()
    const nextWeekly = createEmptySundayBulletinWeekly(weekly)

    if (!trimmedTitle) {
      setError('제목을 입력해 주세요.')
      return
    }

    if (!String(nextWeekly.seasonWeek).trim()) {
      setError('성령강림절 후 제 ○○주를 입력해 주세요.')
      return
    }

    if (isSundayBulletinWeeklyEmpty(nextWeekly)) {
      setError('주보 내용을 입력해 주세요.')
      return
    }

    setSubmitting(true)

    const writer = profile?.name?.trim() || '관리자'
    const content = serializeSundayBulletinWeekly(nextWeekly)
    const payload = {
      title: trimmedTitle,
      content,
      attachmentUrl: null,
      attachmentName: null,
      attachments: [],
      images: [],
      thumbnail: null,
      hasImage: false,
      youtubeUrl: null,
    }

    try {
      const result = isEdit
        ? await updateBoardPost('church_news', postId, payload)
        : await createBoardPost({
            postType: 'church_news',
            writer,
            ...payload,
          })

      if (!result.success) {
        setError(result.message || '게시글 저장 중 오류가 발생했습니다.')
        setSubmitting(false)
        return
      }

      const savedId = result.post?.id ?? postId
      allowNavigation()
      window.alert(isEdit ? '게시글이 수정되었습니다.' : '게시글이 등록되었습니다.')
      navigate(`${detailPathPrefix}/${savedId}`)
    } catch (submitError) {
      setError(submitError.message || '게시글 저장 중 오류가 발생했습니다.')
      setSubmitting(false)
    }
  }

  if (loadingPost) {
    return null
  }

  return (
    <div className="church-news-page">
      <BoardPageHeader title={pageTitle} showDivider />

      <form className="board-write-form sunday-bulletin-form" onSubmit={handleSubmit} noValidate autoComplete="off">
        <h2 className="board-write-form__title">{formTitle}</h2>
        <p className="sunday-bulletin-form__intro">
          매주 변경되는 항목만 입력하면 고정 서식으로 게시됩니다. 섬기는 사람, 선교 및 후원, 엘샤다이중창단은
          수정할 수 없습니다.
        </p>

        <div className="board-write-form__field">
          <label htmlFor="bulletin-title" className="board-write-form__label">
            제목
          </label>
          <input
            id="bulletin-title"
            type="text"
            className="board-write-form__input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={submitting}
            required
            placeholder="예: 2026년 8월 30일 주일예배"
            autoComplete={AUTOCOMPLETE_OFF}
          />
        </div>

        {SUNDAY_BULLETIN_WEEKLY_FIELDS.map((field) => {
          const fieldId = `bulletin-${field.key}`
          const value = weekly[field.key] ?? ''

          return (
            <div key={field.key} className="board-write-form__field">
              <label htmlFor={fieldId} className="board-write-form__label">
                {field.label}
              </label>
              {field.hint ? <p className="sunday-bulletin-form__hint">{field.hint}</p> : null}
              {field.multiline ? (
                <textarea
                  id={fieldId}
                  className="board-write-form__input sunday-bulletin-form__textarea"
                  value={value}
                  onChange={(event) => handleFieldChange(field.key, event.target.value)}
                  disabled={submitting}
                  rows={10}
                  placeholder={field.placeholder}
                  autoComplete={AUTOCOMPLETE_OFF}
                />
              ) : (
                <input
                  id={fieldId}
                  type="text"
                  className="board-write-form__input"
                  value={value}
                  onChange={(event) => handleFieldChange(field.key, event.target.value)}
                  disabled={submitting}
                  placeholder={field.placeholder}
                  autoComplete={AUTOCOMPLETE_OFF}
                />
              )}
            </div>
          )
        })}

        {error && (
          <p className="board-write-form__error" role="alert">
            {error}
          </p>
        )}

        <div className="board-write-form__actions sunday-bulletin-form__actions">
          <button
            type="button"
            className="church-news-detail__list-button board-write-form__cancel"
            onClick={() => setShowPreview((current) => !current)}
            disabled={submitting}
          >
            {showPreview ? '미리보기 닫기' : '미리보기'}
          </button>
          <button
            type="button"
            className="church-news-detail__list-button board-write-form__cancel"
            onClick={() => requestNavigation(listPath)}
            disabled={submitting}
          >
            취소
          </button>
          <button
            type="submit"
            className="church-news-board__search-button board-write-form__submit"
            disabled={submitting}
          >
            {isEdit ? '수정' : '등록'}
          </button>
        </div>
      </form>

      {showPreview ? (
        <div className="sunday-bulletin-form__preview" aria-label="주보 미리보기">
          <h3 className="sunday-bulletin-form__preview-title">미리보기</h3>
          <SundayBulletin weekly={weekly} />
        </div>
      ) : null}

      {isLeaveModalOpen ? (
        <div className="member-management-modal" role="presentation">
          <div className="member-management-modal__dialog" role="dialog" aria-modal="true">
            <h2 className="member-management-modal__title">페이지 이동</h2>
            <p className="member-management-modal__message">
              페이지 이동 시 작성된 게시글은 저장되지 않으며 삭제됩니다.
              {'\n'}
              정말 이동하시겠습니까?
            </p>
            <div className="member-management-modal__actions">
              <button
                type="button"
                className="member-management-modal__button member-management-modal__button--secondary"
                onClick={cancelLeave}
              >
                취소
              </button>
              <button
                type="button"
                className="member-management-modal__button member-management-modal__button--primary"
                onClick={confirmLeave}
              >
                이동
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default SundayBulletinWritePage
