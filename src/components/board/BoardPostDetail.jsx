import { Link } from 'react-router-dom'
import BoardPageHeader from '@/components/board/BoardPageHeader'
import BoardPostExtras from '@/components/board/BoardPostExtras'
import { formatPostDateTime } from '@/utils/formatBoardDate'
import { getPostAuthor } from '@/utils/getPostAuthor'
import '@/pages/ChurchNews.css'

function BoardPostDetail({
  pageTitle,
  pageDescription,
  listPath,
  detailPathPrefix,
  post,
  relatedPosts = [],
  listButtonLabel = '목록으로',
  ariaLabel = '게시글 상세',
  children,
}) {
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
            <time className="church-news-detail__date" dateTime={post.createdAt ?? post.date}>
              {formatPostDateTime(post)}
            </time>
          </div>
          <div className="church-news-detail__meta-row">
            <span className="church-news-detail__author">{getPostAuthor(post)}</span>
            <span className="church-news-detail__views">조회수 {post.views ?? 0}</span>
          </div>
        </header>

        {children}

        {post.content && <p className="church-news-detail__body">{post.content}</p>}

        <BoardPostExtras
          attachments={post.attachments}
          imageAttachments={post.images}
          relatedPosts={relatedPosts}
          detailPathPrefix={detailPathPrefix}
        />

        <div className="church-news-detail__actions">
          <Link to={listPath} className="church-news-detail__list-button">
            {listButtonLabel}
          </Link>
        </div>
      </article>
    </div>
  )
}

export default BoardPostDetail
