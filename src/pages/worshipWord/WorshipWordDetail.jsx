import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiChevronDown, FiHeart, FiPlay, FiUser } from 'react-icons/fi'
import BoardPageHeader from '@/components/board/BoardPageHeader'
import BoardPostAdminBar from '@/components/board/BoardPostAdminBar'
import PostCopyright from '@/components/board/PostCopyright'
import { useAuth } from '@/contexts/AuthContext'
import { useBoardPost } from '@/hooks/useBoardPost'
import { useBoardPostStats } from '@/hooks/useBoardPostStats'
import { getWorshipWordBoard } from '@/data/worshipWord'
import { fetchAdjacentBoardPosts } from '@/services/board/posts'
import { togglePostLike } from '@/services/board/postLikes'
import { formatRelativeTime } from '@/utils/formatBoardDate'
import { getPostAuthor } from '@/utils/getPostAuthor'
import {
  extractYouTubeVideoId,
  getYouTubeEmbedUrl,
  getYouTubeThumbnail,
  getYouTubeThumbnailFallbackQualities,
  upgradeYouTubeThumbnailUrl,
} from '@/utils/youtube'
import { sanitizeBoardHtml } from '@/utils/sanitizeBoardHtml'
import '@/pages/ChurchNews.css'
import './WorshipWord.css'

function WorshipWordDetail({ boardKey }) {
  const board = getWorshipWordBoard(boardKey)
  const { postId } = useParams()
  const { isLoggedIn, user, effectiveUserId } = useAuth()
  const { post, loading } = useBoardPost(board.postType, postId)
  const [adjacent, setAdjacent] = useState({ prev: null, next: null })
  const [isPlaying, setIsPlaying] = useState(false)
  const [posterSrc, setPosterSrc] = useState(null)
  const currentUserId = effectiveUserId ?? user?.id

  const {
    stats,
    likedByMe,
    setLikedByMe,
    refreshStats,
    refreshLikeState,
  } = useBoardPostStats(board.postType, postId, post?.views ?? 0)

  useEffect(() => {
    refreshLikeState(currentUserId)
  }, [refreshLikeState, currentUserId])

  useEffect(() => {
    setIsPlaying(false)

    const videoId = extractYouTubeVideoId(post?.youtubeUrl)
    const fromStored = upgradeYouTubeThumbnailUrl(post?.thumbnail)
    setPosterSrc(fromStored || getYouTubeThumbnail(videoId) || null)
  }, [post?.id, post?.thumbnail, post?.youtubeUrl])

  useEffect(() => {
    if (!postId) {
      return undefined
    }

    let isMounted = true

    async function loadAdjacent() {
      const result = await fetchAdjacentBoardPosts(board.postType, postId)

      if (isMounted) {
        setAdjacent(result)
      }
    }

    loadAdjacent()

    return () => {
      isMounted = false
    }
  }, [board.postType, postId])

  const handleToggleLike = useCallback(async () => {
    if (!isLoggedIn) {
      window.alert('로그인 후 추천할 수 있습니다.')
      return
    }

    const result = await togglePostLike({
      postType: board.postType,
      postId,
      userId: currentUserId,
      liked: likedByMe,
    })

    if (result.success) {
      setLikedByMe(result.liked)
      await refreshStats()
    } else {
      window.alert(result.message)
    }
  }, [
    board.postType,
    currentUserId,
    isLoggedIn,
    likedByMe,
    postId,
    refreshStats,
    setLikedByMe,
  ])

  const handlePosterError = useCallback(
    (event) => {
      const videoId = extractYouTubeVideoId(post?.youtubeUrl)

      if (!videoId) {
        return
      }

      const fallbacks = getYouTubeThumbnailFallbackQualities(event.currentTarget.currentSrc)

      for (const quality of fallbacks) {
        const nextSrc = getYouTubeThumbnail(videoId, quality)

        if (nextSrc && nextSrc !== event.currentTarget.currentSrc) {
          setPosterSrc(nextSrc)
          return
        }
      }
    },
    [post?.youtubeUrl],
  )

  if (loading) {
    return null
  }

  const videoId = extractYouTubeVideoId(post?.youtubeUrl)
  const embedUrl = getYouTubeEmbedUrl(videoId, { autoplay: isPlaying })

  if (!post) {
    return (
      <div className="church-news-page worship-word-page">
        <BoardPageHeader title={board.title} description={board.description} showDivider />
        <div className="worship-word-detail" aria-label={`${board.title} 상세`}>
          <p className="church-news-detail__not-found">게시글을 찾을 수 없습니다.</p>
          <div className="church-news-detail__actions">
            <Link to={board.listPath} className="church-news-detail__list-button">
              목록
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="church-news-page worship-word-page">
      <BoardPageHeader title={board.title} description={board.description} showDivider />

      <article className="worship-word-detail" aria-label={`${board.title} 상세`}>
        <header className="worship-word-detail__header">
          <div className="worship-word-detail__title-row">
            <h2 className="worship-word-detail__title">{post.title}</h2>
            <div className="worship-word-detail__header-actions">
              <BoardPostAdminBar
                postType={board.postType}
                postId={postId}
                listPath={board.listPath}
                post={post}
              />
            </div>
          </div>

          <div className="worship-word-detail__meta">
            <span className="worship-word-detail__avatar" aria-hidden="true">
              <FiUser />
            </span>
            <span className="worship-word-detail__author">{getPostAuthor(post)}</span>
            <span className="worship-word-detail__meta-sep" aria-hidden="true">
              ·
            </span>
            <time dateTime={post.createdAt}>{formatRelativeTime(post.createdAt)}</time>
            <span className="worship-word-detail__meta-sep" aria-hidden="true">
              ·
            </span>
            <span>조회수 {stats.viewsCount}</span>
          </div>
        </header>

        <div className="worship-word-detail__body">
          <div
            className={`worship-word-detail__video${
              isPlaying ? ' worship-word-detail__video--playing' : ''
            }`}
          >
            {embedUrl && isPlaying ? (
              <iframe
                src={embedUrl}
                title={post.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : embedUrl ? (
              <button
                type="button"
                className="worship-word-detail__video-poster"
                onClick={() => setIsPlaying(true)}
                aria-label={`${post.title} 영상 재생`}
              >
                {posterSrc ? (
                  <img
                    src={posterSrc}
                    alt=""
                    className="worship-word-detail__video-thumb"
                    onError={handlePosterError}
                  />
                ) : null}
                <span className="worship-word-detail__video-play" aria-hidden="true">
                  <FiPlay />
                </span>
              </button>
            ) : (
              <div className="worship-word-detail__video-placeholder">
                유튜브 영상이 등록되지 않았습니다.
              </div>
            )}
          </div>

          {post.content?.trim() ? (
            <div
              className="worship-word-detail__content worship-word-detail__content--html"
              dangerouslySetInnerHTML={{ __html: sanitizeBoardHtml(post.content) }}
            />
          ) : null}

          <PostCopyright />
        </div>

        <div className="worship-word-detail__actions-bar">
          <button
            type="button"
            className={`worship-word-detail__like${
              likedByMe ? ' worship-word-detail__like--active' : ''
            }`}
            onClick={handleToggleLike}
            aria-pressed={likedByMe}
          >
            <FiHeart aria-hidden="true" />
            <span>{stats.likesCount}</span>
          </button>
        </div>

        {(adjacent.prev || adjacent.next) && (
          <nav className="worship-word-detail__adjacent" aria-label="이전 다음 게시글">
            {adjacent.prev && (
              <Link
                to={`${board.listPath}/${adjacent.prev.id}`}
                className="worship-word-detail__adjacent-link"
              >
                <FiChevronDown aria-hidden="true" />
                <span>{adjacent.prev.title}</span>
              </Link>
            )}
            {adjacent.next && (
              <Link
                to={`${board.listPath}/${adjacent.next.id}`}
                className="worship-word-detail__adjacent-link"
              >
                <FiChevronDown aria-hidden="true" />
                <span>{adjacent.next.title}</span>
              </Link>
            )}
          </nav>
        )}

        <div className="worship-word-detail__footer">
          <Link to={board.listPath} className="worship-word-detail__list-button">
            목록
          </Link>
        </div>
      </article>
    </div>
  )
}

export default WorshipWordDetail
