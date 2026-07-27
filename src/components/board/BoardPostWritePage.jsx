import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BoardPageHeader from '@/components/board/BoardPageHeader'
import BoardRichEditor from '@/components/board/editor/BoardRichEditor'
import BoardThumbnailField from '@/components/board/BoardThumbnailField'
import BoardAttachmentField from '@/components/board/BoardAttachmentField'
import { useAuth } from '@/contexts/AuthContext'
import { useUnsavedLeaveGuard } from '@/hooks/useUnsavedLeaveGuard'
import { canEditPost } from '@/services/auth/roles'
import {
  createBoardPost,
  fetchBoardPost,
  updateBoardPost,
} from '@/services/board/posts'
import {
  buildBoardCmsStoragePath,
  deleteBoardFiles,
  uploadBoardFile,
} from '@/services/board/storage'
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import {
  computeHasImage,
  extractStoragePathFromPublicUrl,
  getFirstContentImageSrc,
} from '@/utils/boardContentImages'
import { resizeImageFile, resizeThumbnailFile } from '@/utils/resizeImageFile'
import { isBoardHtmlEmpty, sanitizeBoardHtml } from '@/utils/sanitizeBoardHtml'
import { resolveYouTubeMedia } from '@/utils/youtube'
import '@/pages/ChurchNews.css'
import '@/pages/MemberManagement.css'

function mapBoardWriteErrorMessage(message) {
  if (!message) {
    return '게시글 등록 중 오류가 발생했습니다.'
  }

  if (
    message.includes('Could not find the table') ||
    message.includes('schema cache') ||
    message.includes('board_posts') ||
    message.includes('board_post_meta') ||
    message.includes('ensure_board_post_meta') ||
    message.includes('has_image') ||
    message.includes('attachments') ||
    message.includes('youtube_url') ||
    message.includes('post_type')
  ) {
    return '게시판 DB가 아직 준비되지 않았습니다. Supabase에 CMS 마이그레이션(019)을 먼저 적용해 주세요.'
  }

  return message
}

async function uploadCmsFile(kind, postType, postId, file) {
  const path = buildBoardCmsStoragePath(kind, postType, postId, file.name)
  return uploadBoardFile(path, file, postType)
}

function BoardPostWritePage({
  postType,
  pageTitle,
  formTitle,
  listPath,
  detailPathPrefix,
  mode = 'create',
  postId = null,
  writeVariant = 'default',
}) {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const isEdit = mode === 'edit'
  const isVideoWrite = writeVariant === 'video'

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [thumbnailState, setThumbnailState] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [removedPaths, setRemovedPaths] = useState([])
  const [legacyImages, setLegacyImages] = useState([])
  const [loadingPost, setLoadingPost] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [initialSnapshot, setInitialSnapshot] = useState(
    JSON.stringify({
      title: '',
      content: '',
      youtubeUrl: '',
      thumbnail: null,
      attachments: [],
    }),
  )
  const draftPostIdRef = useRef(isEdit ? postId : crypto.randomUUID())
  const draftUploadedPathsRef = useRef([])

  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        title,
        content,
        youtubeUrl,
        thumbnail: thumbnailState
          ? {
              existingUrl: thumbnailState.existingUrl ?? null,
              hasFile: Boolean(thumbnailState.file),
            }
          : null,
        attachments: attachments.map((item) => ({
          key: item.key,
          name: item.name,
          url: item.url ?? null,
          hasFile: Boolean(item.file),
        })),
      }),
    [attachments, content, thumbnailState, title, youtubeUrl],
  )

  const isDirty = !loadingPost && currentSnapshot !== initialSnapshot

  const cleanupDraftUploads = async () => {
    const paths = draftUploadedPathsRef.current.filter(Boolean)
    draftUploadedPathsRef.current = []

    if (paths.length > 0 && !isEdit) {
      await deleteBoardFiles(paths, postType)
    }
  }

  const {
    isLeaveModalOpen,
    cancelLeave,
    confirmLeave,
    allowNavigation,
    requestNavigation,
  } = useUnsavedLeaveGuard({
    isDirty,
    onConfirmLeave: () => {
      void cleanupDraftUploads()
    },
  })

  useEffect(() => {
    if (!isEdit || !postId) {
      return undefined
    }

    let isMounted = true

    async function loadPost() {
      const result = await fetchBoardPost(postType, postId)

      if (!isMounted) {
        return
      }

      if (!result.success || !result.post) {
        setError(result.message || '게시글을 불러올 수 없습니다.')
        setLoadingPost(false)
        return
      }

      if (!canEditPost(profile, result.post, user?.id)) {
        setError('이 게시글을 수정할 권한이 없습니다.')
        setLoadingPost(false)
        return
      }

      const post = result.post
      setTitle(post.title)
      setContent(post.content || '')
      setYoutubeUrl(post.youtubeUrl || '')
      setLegacyImages(post.images ?? [])

      if (post.thumbnail) {
        setThumbnailState({
          file: null,
          previewUrl: null,
          existingUrl: post.thumbnail,
          existingPath: extractStoragePathFromPublicUrl(post.thumbnail),
        })
      }

      setAttachments(
        (post.attachments ?? []).map((file, index) => ({
          key: file.key || file.path || file.url || `existing-${index}`,
          file: null,
          name: file.name,
          size: file.size,
          mime: file.mime,
          url: file.url,
          path: file.path,
        })),
      )

      setInitialSnapshot(
        JSON.stringify({
          title: post.title || '',
          content: post.content || '',
          youtubeUrl: post.youtubeUrl || '',
          thumbnail: post.thumbnail
            ? { existingUrl: post.thumbnail, hasFile: false }
            : null,
          attachments: (post.attachments ?? []).map((file, index) => ({
            key: file.key || file.path || file.url || `existing-${index}`,
            name: file.name,
            url: file.url ?? null,
            hasFile: false,
          })),
        }),
      )

      setLoadingPost(false)
    }

    loadPost()

    return () => {
      isMounted = false
    }
  }, [isEdit, postId, postType, profile, user?.id])

  const handleThumbnailChange = (next) => {
    if (thumbnailState?.existingPath) {
      setRemovedPaths((current) => [...current, thumbnailState.existingPath])
    }

    if (thumbnailState?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(thumbnailState.previewUrl)
    }

    setThumbnailState(next)
  }

  const handleAttachmentsChange = (next) => {
    const removed = attachments.filter(
      (item) => item.path && !next.some((candidate) => candidate.key === item.key),
    )

    if (removed.length > 0) {
      setRemovedPaths((current) => [
        ...current,
        ...removed.map((item) => item.path).filter(Boolean),
      ])
    }

    setAttachments(next)
  }

  const handleUploadEditorImage = async (file) => {
    const postIdForUpload = isEdit ? postId : draftPostIdRef.current
    const resized = await resizeImageFile(file, { maxWidth: 1600, maxHeight: 1600 })
    const result = await uploadCmsFile('image', postType, postIdForUpload, resized)

    if (result?.path && !isEdit) {
      draftUploadedPathsRef.current.push(result.path)
    }

    return result
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const trimmedTitle = title.trim()
    const sanitizedContent = sanitizeBoardHtml(content)
    const trimmedYoutubeUrl = youtubeUrl.trim()

    if (!trimmedTitle) {
      setError('제목을 입력해 주세요.')
      return
    }

    if (!isVideoWrite && isBoardHtmlEmpty(sanitizedContent)) {
      setError('내용을 입력해 주세요.')
      return
    }

    let youtubeMedia = null

    if (isVideoWrite) {
      youtubeMedia = resolveYouTubeMedia(trimmedYoutubeUrl)

      if (!youtubeMedia) {
        setError('올바른 유튜브 링크를 입력해 주세요.')
        return
      }
    }

    setSubmitting(true)

    const writer = profile?.name?.trim() || '관리자'
    const targetPostId = isEdit ? postId : draftPostIdRef.current
    const uploadedPaths = []

    try {
      let thumbnailUrl = thumbnailState?.existingUrl ?? null
      let thumbnailPath = thumbnailState?.existingPath ?? null

      if (thumbnailState?.file) {
        const resizedThumb = await resizeThumbnailFile(thumbnailState.file)
        const uploadResult = await uploadCmsFile('thumbnail', postType, targetPostId, resizedThumb)

        if (!uploadResult.success) {
          setError(uploadResult.message)
          setSubmitting(false)
          return
        }

        thumbnailUrl = uploadResult.url
        thumbnailPath = uploadResult.path
        uploadedPaths.push(uploadResult.path)
      }

      if (!thumbnailUrl && !isVideoWrite) {
        thumbnailUrl = getFirstContentImageSrc(sanitizedContent)
      }

      if (isVideoWrite && !thumbnailUrl) {
        thumbnailUrl = youtubeMedia.thumbnail
      }

      const attachmentsPayload = []

      for (const item of attachments) {
        if (item.url && item.path) {
          attachmentsPayload.push({
            url: item.url,
            path: item.path,
            name: item.name,
            size: item.size ?? null,
            mime: item.mime || null,
          })
          continue
        }

        if (item.url && !item.file) {
          attachmentsPayload.push({
            url: item.url,
            path: item.path || null,
            name: item.name,
            size: item.size ?? null,
            mime: item.mime || null,
          })
          continue
        }

        if (!item.file) {
          continue
        }

        const uploadResult = await uploadCmsFile('file', postType, targetPostId, item.file)

        if (!uploadResult.success) {
          if (uploadedPaths.length > 0) {
            await deleteBoardFiles(uploadedPaths, postType)
          }

          setError(uploadResult.message)
          setSubmitting(false)
          return
        }

        uploadedPaths.push(uploadResult.path)
        attachmentsPayload.push({
          url: uploadResult.url,
          path: uploadResult.path,
          name: item.name,
          size: item.file.size,
          mime: item.file.type || null,
        })
      }

      const hasImage = computeHasImage({
        contentHtml: sanitizedContent,
        thumbnail: thumbnailUrl,
        images: legacyImages,
      })

      const firstAttachment = attachmentsPayload[0] ?? null

      const payload = {
        title: trimmedTitle,
        content: sanitizedContent,
        writer,
        attachmentUrl: firstAttachment?.url ?? null,
        attachmentName: firstAttachment?.name ?? null,
        attachments: attachmentsPayload,
        images: legacyImages.map((image) => ({
          url: image.src,
          path: image.path,
          alt: image.alt || '',
          name: image.name || '',
        })),
        thumbnail: thumbnailUrl,
        hasImage,
        youtubeUrl: isVideoWrite ? youtubeMedia.youtubeUrl : null,
      }

      // Keep thumbnail path for delete cleanup tracking (unused var ok via void)
      void thumbnailPath

      const result = isEdit
        ? await updateBoardPost(postType, targetPostId, payload)
        : await createBoardPost({
            postType,
            id: targetPostId,
            ...payload,
          })

      if (!result.success) {
        if (!isEdit && uploadedPaths.length > 0) {
          await deleteBoardFiles(uploadedPaths, postType)
        }

        setError(mapBoardWriteErrorMessage(result.message))
        setSubmitting(false)
        return
      }

      if (removedPaths.length > 0) {
        await deleteBoardFiles(removedPaths, postType)
      }

      draftUploadedPathsRef.current = []
      allowNavigation()
      window.alert(isEdit ? '게시글이 수정되었습니다.' : '게시글이 등록되었습니다.')
      navigate(`${detailPathPrefix}/${targetPostId}`)
    } catch (submitError) {
      if (!isEdit && uploadedPaths.length > 0) {
        await deleteBoardFiles(uploadedPaths, postType)
      }

      setError(submitError.message || '게시글 저장 중 오류가 발생했습니다.')
      setSubmitting(false)
    }
  }

  if (loadingPost) {
    return null
  }

  const youtubePreview = isVideoWrite ? resolveYouTubeMedia(youtubeUrl) : null

  return (
    <div className="church-news-page">
      <BoardPageHeader title={pageTitle} showDivider />

      <form className="board-write-form" onSubmit={handleSubmit} noValidate autoComplete="off">
        <h2 className="board-write-form__title">{formTitle}</h2>

        <div className="board-write-form__field">
          <label htmlFor="board-write-title" className="board-write-form__label">
            제목
          </label>
          <input
            id="board-write-title"
            type="text"
            className="board-write-form__input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={submitting}
            required
            autoComplete={AUTOCOMPLETE_OFF}
          />
        </div>

        {isVideoWrite && (
          <div className="board-write-form__field">
            <label htmlFor="board-write-youtube" className="board-write-form__label">
              유튜브 링크
            </label>
            <input
              id="board-write-youtube"
              type="url"
              className="board-write-form__input"
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              disabled={submitting}
              placeholder="https://www.youtube.com/watch?v=..."
              required
              autoComplete={AUTOCOMPLETE_OFF}
            />
            {youtubePreview?.thumbnail && (
              <div className="board-write-form__youtube-preview">
                <img src={youtubePreview.thumbnail} alt="유튜브 썸네일 미리보기" />
              </div>
            )}
          </div>
        )}

        <div className="board-write-form__field">
          <span className="board-write-form__label">내용{isVideoWrite ? ' (선택)' : ''}</span>
          <BoardRichEditor
            value={content}
            onChange={setContent}
            onUploadImage={handleUploadEditorImage}
            disabled={submitting}
            placeholder={
              isVideoWrite ? '영상 설명을 입력해 주세요. (선택)' : '내용을 입력해 주세요.'
            }
          />
        </div>

        <div className="board-write-form__field">
          <BoardThumbnailField
            value={thumbnailState}
            onChange={handleThumbnailChange}
            disabled={submitting}
          />
        </div>

        <div className="board-write-form__field">
          <BoardAttachmentField
            items={attachments}
            onChange={handleAttachmentsChange}
            disabled={submitting}
          />
        </div>

        {error && (
          <p className="board-write-form__error" role="alert">
            {error}
          </p>
        )}

        <div className="board-write-form__actions">
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
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default BoardPostWritePage
