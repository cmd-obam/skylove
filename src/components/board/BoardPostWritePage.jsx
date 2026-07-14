import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiX } from 'react-icons/fi'
import BoardPageHeader from '@/components/board/BoardPageHeader'
import AlbumImageUploader, { revokeAlbumImagePreviews } from '@/components/board/AlbumImageUploader'
import { useAuth } from '@/contexts/AuthContext'
import {
  createBoardPost,
  fetchBoardPost,
  updateBoardPost,
} from '@/services/board/posts'
import {
  buildBoardStoragePath,
  deleteBoardFiles,
  uploadBoardFile,
} from '@/services/board/storage'
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import { resolveYouTubeMedia } from '@/utils/youtube'
import '@/pages/ChurchNews.css'

async function uploadAlbumImages(postType, postId, images) {
  const uploaded = []

  for (const image of images) {
    if (image.path && image.url) {
      uploaded.push({
        url: image.url,
        path: image.path,
        alt: image.alt || '',
        name: image.name || '',
      })
      continue
    }

    if (!image.file) {
      continue
    }

    const path = buildBoardStoragePath(postType, postId, image.file.name)
    const result = await uploadBoardFile(path, image.file)

    if (!result.success) {
      return result
    }

    uploaded.push({
      url: result.url,
      path: result.path,
      alt: image.alt || image.file.name,
      name: image.file.name,
    })
  }

  return { success: true, images: uploaded }
}

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
    message.includes('youtube_url') ||
    message.includes('post_type')
  ) {
    return '게시판 DB가 아직 준비되지 않았습니다. Supabase에 예배말씀 마이그레이션(014)을 먼저 적용해 주세요.'
  }

  return message
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
  const { profile } = useAuth()
  const isEdit = mode === 'edit'
  const isVideoWrite = writeVariant === 'video'

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [attachmentFile, setAttachmentFile] = useState(null)
  const [existingAttachment, setExistingAttachment] = useState(null)
  const [albumImages, setAlbumImages] = useState([])
  const albumImagesRef = useRef(albumImages)
  albumImagesRef.current = albumImages
  const [removedImagePaths, setRemovedImagePaths] = useState([])
  const [loadingPost, setLoadingPost] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

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

      setTitle(result.post.title)
      setContent(result.post.content)
      setYoutubeUrl(result.post.youtubeUrl || '')

      if (result.post.attachments?.[0]) {
        setExistingAttachment(result.post.attachments[0])
      }

      if (postType === 'album') {
        setAlbumImages(
          (result.post.images ?? []).map((image) => ({
            key: image.path || image.src,
            url: image.src,
            path: image.path,
            preview: image.src,
            alt: image.alt,
            name: image.name,
          })),
        )
      }

      setLoadingPost(false)
    }

    loadPost()

    return () => {
      isMounted = false
    }
  }, [isEdit, postId, postType])

  useEffect(() => {
    return () => {
      revokeAlbumImagePreviews(albumImagesRef.current)
    }
  }, [])

  const handleAttachmentChange = (event) => {
    const file = event.target.files?.[0] ?? null
    setAttachmentFile(file)
    event.target.value = ''
  }

  const handleClearAttachment = () => {
    setAttachmentFile(null)
    setExistingAttachment(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    const trimmedYoutubeUrl = youtubeUrl.trim()

    if (!trimmedTitle) {
      setError('제목을 입력해 주세요.')
      return
    }

    if (!isVideoWrite && !trimmedContent) {
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

    if (postType === 'album' && albumImages.length === 0) {
      setError('사진을 한 장 이상 추가해 주세요.')
      return
    }

    setSubmitting(true)

    const writer = profile?.name?.trim() || '관리자'
    const targetPostId = isEdit ? postId : crypto.randomUUID()
    const uploadedPaths = []

    let attachmentUrl = existingAttachment?.url ?? null
    let attachmentName = existingAttachment?.name ?? null

    if (!isVideoWrite && attachmentFile) {
      const path = buildBoardStoragePath(postType, targetPostId, attachmentFile.name)
      const uploadResult = await uploadBoardFile(path, attachmentFile)

      if (!uploadResult.success) {
        setError(uploadResult.message)
        setSubmitting(false)
        return
      }

      attachmentUrl = uploadResult.url
      attachmentName = attachmentFile.name
      uploadedPaths.push(uploadResult.path)
    } else if (!isVideoWrite && !existingAttachment) {
      attachmentUrl = null
      attachmentName = null
    }

    let imagesPayload = []
    let thumbnail = null

    if (postType === 'album') {
      const uploadResult = await uploadAlbumImages(postType, targetPostId, albumImages)

      if (!uploadResult.success) {
        setError(uploadResult.message)
        setSubmitting(false)
        return
      }

      imagesPayload = uploadResult.images
      thumbnail = imagesPayload[0]?.url ?? null
      uploadedPaths.push(...uploadResult.images.map((image) => image.path).filter(Boolean))
    }

    if (isVideoWrite) {
      thumbnail = youtubeMedia.thumbnail
      attachmentUrl = null
      attachmentName = null
      imagesPayload = []
    }

    const payload = {
      title: trimmedTitle,
      content: trimmedContent,
      writer,
      attachmentUrl,
      attachmentName,
      images: imagesPayload,
      thumbnail,
      youtubeUrl: isVideoWrite ? youtubeMedia.youtubeUrl : null,
    }

    const result = isEdit
      ? await updateBoardPost(postType, targetPostId, payload)
      : await createBoardPost({
          postType,
          id: targetPostId,
          ...payload,
        })

    if (!result.success) {
      if (!isEdit && uploadedPaths.length > 0) {
        await deleteBoardFiles(uploadedPaths)
      }

      setError(mapBoardWriteErrorMessage(result.message))
      setSubmitting(false)
      return
    }

    if (removedImagePaths.length > 0) {
      await deleteBoardFiles(removedImagePaths)
    }

    window.alert(isEdit ? '게시글이 수정되었습니다.' : '게시글이 등록되었습니다.')
    navigate(`${detailPathPrefix}/${targetPostId}`)
  }

  const handleAlbumImagesChange = (nextImages) => {
    const removed = albumImages.filter(
      (image) => image.path && !nextImages.some((next) => next.key === image.key),
    )

    if (removed.length > 0) {
      setRemovedImagePaths((current) => [
        ...current,
        ...removed.map((image) => image.path).filter(Boolean),
      ])
    }

    setAlbumImages(nextImages)
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
          <label htmlFor="board-write-content" className="board-write-form__label">
            내용{isVideoWrite ? ' (선택)' : ''}
          </label>
          <textarea
            id="board-write-content"
            className="board-write-form__textarea"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={submitting}
            rows={isVideoWrite || postType === 'album' ? 6 : 12}
            required={!isVideoWrite}
            autoComplete={AUTOCOMPLETE_OFF}
          />
        </div>

        {postType === 'church_news' && (
          <div className="board-write-form__field">
            <span className="board-write-form__label">첨부파일</span>
            <div className="board-write-form__file-row">
              <label className="board-write-form__file-button">
                <input
                  type="file"
                  className="visually-hidden"
                  onChange={handleAttachmentChange}
                  disabled={submitting}
                />
                파일선택
              </label>
              {(attachmentFile || existingAttachment) && (
                <div className="board-write-form__file-name">
                  <span>{attachmentFile?.name || existingAttachment?.name}</span>
                  <button
                    type="button"
                    className="board-write-form__file-remove"
                    onClick={handleClearAttachment}
                    disabled={submitting}
                    aria-label="첨부파일 제거"
                  >
                    <FiX aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {postType === 'album' && (
          <div className="board-write-form__field">
            <span className="board-write-form__label">사진 업로드</span>
            <AlbumImageUploader
              images={albumImages}
              onChange={handleAlbumImagesChange}
              disabled={submitting}
            />
          </div>
        )}

        {error && (
          <p className="board-write-form__error" role="alert">
            {error}
          </p>
        )}

        <div className="board-write-form__actions">
          <Link
            to={listPath}
            className="church-news-detail__list-button board-write-form__cancel"
          >
            취소
          </Link>
          <button
            type="submit"
            className="church-news-board__search-button board-write-form__submit"
            disabled={submitting}
          >
            {isEdit ? '수정' : '등록'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default BoardPostWritePage
