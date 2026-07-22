import { useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiHeart, FiImage } from 'react-icons/fi'
import BoardPageHeader from '@/components/board/BoardPageHeader'
import BoardPostExtras from '@/components/board/BoardPostExtras'
import BoardPostComments from '@/components/board/BoardPostComments'
import BoardPostAdminBar from '@/components/board/BoardPostAdminBar'
import AlbumImageGallery from '@/components/board/AlbumImageGallery'
import PostCopyright from '@/components/board/PostCopyright'
import { useBoardPostStats } from '@/hooks/useBoardPostStats'
import { useAuth } from '@/contexts/AuthContext'
import { togglePostLike } from '@/services/board/postLikes'
import { formatPostRegistrationDate } from '@/utils/formatBoardDate'
import { getPostAuthor } from '@/utils/getPostAuthor'
import { openBoardPostViewer } from '@/utils/boardPostViewer'
import { sanitizeBoardHtml } from '@/utils/sanitizeBoardHtml'
import '@/pages/ChurchNews.css'

function BoardPostDetail({
  pageTitle,
  pageDescription,
  listPath,
  detailPathPrefix,
  postType,
  post,
  relatedPosts = [],
  listButtonLabel = '목록',
  ariaLabel = '게시글 상세',
  detailVariant = 'default',
  afterBody = null,
  children,
}) {
  const { isLoggedIn, user } = useAuth()
  const postId = post?.id
  const isAlbumDetail = detailVariant === 'album'

  const {
    stats,
    likedByMe,
    setLikedByMe,
    refreshStats,
    refreshLikeState,
  } = useBoardPostStats(postType, postId, post?.views ?? 0)

  useEffect(() => {
    refreshLikeState(user?.id)
  }, [refreshLikeState, user?.id])

  const handleCommentsCountChange = useCallback(() => {
    refreshStats()
  }, [refreshStats])

  const handleToggleLike = async () => {
    if (!isLoggedIn) {
      window.alert('로그인 후 추천할 수 있습니다.')
      return
    }

    const result = await togglePostLike({
      postType,
      postId,
      userId: user.id,
      liked: likedByMe,
    })

    if (result.success) {
      setLikedByMe(result.liked)
      await refreshStats()
    } else {
      window.alert(result.message)
    }
  }

  const handleOpenViewer = () => {
    if (!post?.images?.length || postId == null) {
      return
    }

    openBoardPostViewer(postId)
  }

  const hasImages = Boolean(post?.images?.length)
  const bodyHtml = post?.content ? sanitizeBoardHtml(post.content) : ''

  if (!post) {
    return (
      <div className="church-news-page">
        <BoardPageHeader title={pageTitle} description={pageDescription} showDivider />
        <div className="church-news-detail" aria-label={ariaLabel}>
          <p className="church-news-detail__not-found">게시글을 찾을 수 없습니다.</p>
          <div className="church-news-detail__actions">
            <Link to={listPath} className="church-news-detail__list-button">
              {listButtonLabel}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="church-news-page">
      <BoardPageHeader title={pageTitle} description={pageDescription} showDivider />

      <article className="church-news-detail" aria-label={ariaLabel}>
        <header className="church-news-detail__header">
          <div className="church-news-detail__title-row">
            <h2 className="church-news-detail__title">{post.title}</h2>
            <div className="church-news-detail__header-actions">
              <BoardPostAdminBar
                postType={postType}
                postId={postId}
                listPath={listPath}
                post={post}
              />
              <Link to={listPath} className="church-news-detail__header-button">
                {listButtonLabel}
              </Link>
              {hasImages && (
                <button
                  type="button"
                  className="church-news-detail__header-button church-news-detail__header-button--viewer"
                  onClick={handleOpenViewer}
                >
                  <FiImage aria-hidden="true" />
                  <span>뷰어로 보기</span>
                </button>
              )}
            </div>
          </div>

          <div className="church-news-detail__meta-row">
            <div className="church-news-detail__meta-items">
              {!isAlbumDetail && (
                <>
                  <span className="church-news-detail__meta-item">
                    <span className="church-news-detail__meta-label">작성자</span>
                    <span className="church-news-detail__meta-value">{getPostAuthor(post)}</span>
                  </span>
                  <span className="church-news-detail__meta-divider" aria-hidden="true">
                    |
                  </span>
                </>
              )}
              <span className="church-news-detail__meta-item">
                <span className="church-news-detail__meta-label">등록일</span>
                <span className="church-news-detail__meta-value">
                  {formatPostRegistrationDate(post)}
                </span>
              </span>
              {!isAlbumDetail && (
                <>
                  <span className="church-news-detail__meta-divider" aria-hidden="true">
                    |
                  </span>
                  <span className="church-news-detail__meta-item">
                    <button
                      type="button"
                      className={`church-news-detail__like-button${
                        likedByMe ? ' church-news-detail__like-button--active' : ''
                      }`}
                      onClick={handleToggleLike}
                      aria-pressed={likedByMe}
                    >
                      <FiHeart aria-hidden="true" />
                      <span className="church-news-detail__meta-label">추천</span>
                      <span className="church-news-detail__meta-value">{stats.likesCount}</span>
                    </button>
                  </span>
                  <span className="church-news-detail__meta-divider" aria-hidden="true">
                    |
                  </span>
                  <span className="church-news-detail__meta-item">
                    <span className="church-news-detail__meta-label">댓글</span>
                    <span className="church-news-detail__meta-value">{stats.commentsCount}</span>
                  </span>
                </>
              )}
              <span className="church-news-detail__meta-divider" aria-hidden="true">
                |
              </span>
              <span className="church-news-detail__meta-item">
                <span className="church-news-detail__meta-label">조회수</span>
                <span className="church-news-detail__meta-value">{stats.viewsCount}</span>
              </span>
            </div>
          </div>
        </header>

        {children}

        {bodyHtml ? (
          <div
            className="church-news-detail__body church-news-detail__body--html"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : null}

        <PostCopyright />

        {afterBody}

        {hasImages ? (
          <div className="church-news-detail__legacy-gallery">
            <AlbumImageGallery images={post.images} />
          </div>
        ) : null}

        <BoardPostExtras
          attachments={post.attachments}
          relatedPosts={relatedPosts}
          detailPathPrefix={detailPathPrefix}
        />

        <BoardPostComments
          postType={postType}
          postId={postId}
          onCommentsCountChange={handleCommentsCountChange}
        />
      </article>
    </div>
  )
}

export default BoardPostDetail
