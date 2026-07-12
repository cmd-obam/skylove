import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import ViewerUtilityBar from '@/components/board/ViewerUtilityBar'
import { supabase } from '@/lib/supabase'
import { fetchBoardPostById } from '@/services/board/posts'
import { fetchPostMeta } from '@/services/board/postStats'
import { formatPostRegistrationDate } from '@/utils/formatBoardDate'
import { getPostAuthor } from '@/utils/getPostAuthor'
import './BoardPostViewerPage.css'

function BoardPostViewerPage() {
  const { postId } = useParams()
  const [post, setPost] = useState(null)
  const [viewsCount, setViewsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!postId) {
      setLoading(false)
      setNotFound(true)
      return undefined
    }

    let isMounted = true

    async function loadPost() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (!session?.user) {
        setPost(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setNotFound(false)

      const result = await fetchBoardPostById(postId)

      if (!isMounted) {
        return
      }

      if (!result.success || !result.post) {
        setPost(null)
        setNotFound(true)
        setLoading(false)
        return
      }

      setPost(result.post)

      const metaResult = await fetchPostMeta(result.postType, postId)

      if (isMounted && metaResult.success) {
        setViewsCount(metaResult.stats.views_count ?? 0)
      }

      if (isMounted) {
        setLoading(false)
      }
    }

    loadPost()

    return () => {
      isMounted = false
    }
  }, [postId])

  useEffect(() => {
    if (!post?.title) {
      return undefined
    }

    const previousTitle = document.title
    document.title = `${post.title} | 뷰어`

    return () => {
      document.title = previousTitle
    }
  }, [post?.title])

  if (loading) {
    return (
      <div className="board-post-viewer-page">
        <p className="board-post-viewer-page__status" role="status">
          불러오는 중...
        </p>
      </div>
    )
  }

  if (notFound || !post) {
    return (
      <div className="board-post-viewer-page">
        <p className="board-post-viewer-page__status">게시글을 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="board-post-viewer-page">
      <ViewerUtilityBar />

      <article className="board-post-viewer-paper board-post-viewer" aria-label="게시글 뷰어">
        <header className="board-post-viewer__header">
          <h1 className="board-post-viewer__title">{post.title}</h1>
          <dl className="board-post-viewer__meta">
            <div className="board-post-viewer__meta-row">
              <dt>작성일</dt>
              <dd>{formatPostRegistrationDate(post)}</dd>
            </div>
            <div className="board-post-viewer__meta-row">
              <dt>조회수</dt>
              <dd>{viewsCount}</dd>
            </div>
            <div className="board-post-viewer__meta-row">
              <dt>작성자</dt>
              <dd>{getPostAuthor(post)}</dd>
            </div>
          </dl>
        </header>

        {post.content && <p className="board-post-viewer__body">{post.content}</p>}

        {post.images?.length > 0 && (
          <div className="board-post-viewer__images">
            {post.images.map((image, index) => (
              <figure key={`${image.src}-${index}`} className="board-post-viewer__figure">
                <img
                  src={image.src}
                  alt={image.alt || `${post.title} 사진 ${index + 1}`}
                  className="board-post-viewer__image"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </figure>
            ))}
          </div>
        )}
      </article>
    </div>
  )
}

export default BoardPostViewerPage
