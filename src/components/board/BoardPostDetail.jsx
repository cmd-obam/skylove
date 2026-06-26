import { Link } from 'react-router-dom'
import BoardPageHeader from '@/components/board/BoardPageHeader'
import { formatBoardDate } from '@/utils/formatBoardDate'
import '@/pages/ChurchNews.css'

function BoardPostDetail({
  pageTitle,
  pageDescription,
  listPath,
  detailPathPrefix,
  post,
  prev = null,
  next = null,
  listButtonLabel = '목록으로',
  ariaLabel = '게시글 상세',
  showAdjacent = false,
  children,
}) {
  if (!post) {
    return (
      <div className="church-news-page">
        <BoardPageHeader title={pageTitle} description={pageDescription} />
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
      <BoardPageHeader title={pageTitle} description={pageDescription} />

      <article className="church-news-detail" aria-label={ariaLabel}>
        <header className="church-news-detail__header">
          <h2 className="church-news-detail__title">{post.title}</h2>
          <dl className="church-news-detail__meta-list">
            <div className="church-news-detail__meta-item">
              <dt>작성일</dt>
              <dd>{formatBoardDate(post.date)}</dd>
            </div>
            <div className="church-news-detail__meta-item">
              <dt>조회수</dt>
              <dd>{post.views}</dd>
            </div>
          </dl>
        </header>

        {children}

        {post.content && <p className="church-news-detail__body">{post.content}</p>}

        {showAdjacent && (
          <nav className="church-news-detail__adjacent" aria-label="이전글 다음글">
            <div className="church-news-detail__adjacent-row">
              <span className="church-news-detail__adjacent-label">이전글</span>
              {prev ? (
                <Link
                  to={`${detailPathPrefix}/${prev.id}`}
                  className="church-news-detail__adjacent-link"
                >
                  {prev.title}
                </Link>
              ) : (
                <span className="church-news-detail__adjacent-empty">이전글이 없습니다.</span>
              )}
            </div>
            <div className="church-news-detail__adjacent-row">
              <span className="church-news-detail__adjacent-label">다음글</span>
              {next ? (
                <Link
                  to={`${detailPathPrefix}/${next.id}`}
                  className="church-news-detail__adjacent-link"
                >
                  {next.title}
                </Link>
              ) : (
                <span className="church-news-detail__adjacent-empty">다음글이 없습니다.</span>
              )}
            </div>
          </nav>
        )}

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
