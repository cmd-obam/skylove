import { Link, useParams } from 'react-router-dom'
import Breadcrumb from '@/components/Breadcrumb'
import {
  getAdjacentEventPhotoPosts,
  getEventPhotoPost,
} from '@/data/eventPhotos'
import './ChurchNews.css'

const LIST_PATH = '/church-news/album'

function EventPhotoDetail() {
  const { postId } = useParams()
  const post = getEventPhotoPost(postId)
  const { prev, next } = getAdjacentEventPhotoPosts(postId)

  if (!post) {
    return (
      <div className="church-news-page">
        <header className="church-news-page__header">
          <div className="church-news-page__heading">
            <h1 className="church-news-page__title">교회앨범</h1>
            <p className="church-news-page__description">
              교회 행사와 다양한 활동 사진을 소개합니다.
            </p>
          </div>
          <Breadcrumb />
        </header>

        <div className="church-news-detail" aria-label="교회앨범 상세">
          <p className="church-news-detail__not-found">게시글을 찾을 수 없습니다.</p>
          <div className="church-news-detail__actions">
            <Link to={LIST_PATH} className="church-news-detail__list-button">
              목록
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="church-news-page">
      <header className="church-news-page__header">
        <div className="church-news-page__heading">
          <h1 className="church-news-page__title">교회앨범</h1>
          <p className="church-news-page__description">
            교회 행사와 다양한 활동 사진을 소개합니다.
          </p>
        </div>
        <Breadcrumb />
      </header>

      <article className="church-news-detail" aria-label="교회앨범 상세">
        <header className="church-news-detail__header">
          <h2 className="church-news-detail__title">{post.title}</h2>
          <div className="church-news-detail__meta">
            <span>작성일 {post.date}</span>
            <span className="church-news-detail__meta-divider" aria-hidden="true">
              |
            </span>
            <span>조회 {post.views}</span>
          </div>
        </header>

        {post.images?.length > 0 && (
          <div className="church-news-detail__images">
            {post.images.map((image, index) => (
              <figure key={`${post.id}-image-${index}`} className="church-news-detail__figure">
                <img
                  src={image.src}
                  alt={image.alt || `${post.title} 사진 ${index + 1}`}
                  className="church-news-detail__image"
                />
              </figure>
            ))}
          </div>
        )}

        {post.content && <p className="church-news-detail__body">{post.content}</p>}

        <nav className="church-news-detail__adjacent" aria-label="이전글 다음글">
          <div className="church-news-detail__adjacent-row">
            <span className="church-news-detail__adjacent-label">이전글</span>
            {prev ? (
              <Link to={`${LIST_PATH}/${prev.id}`} className="church-news-detail__adjacent-link">
                {prev.title}
              </Link>
            ) : (
              <span className="church-news-detail__adjacent-empty">이전글이 없습니다.</span>
            )}
          </div>
          <div className="church-news-detail__adjacent-row">
            <span className="church-news-detail__adjacent-label">다음글</span>
            {next ? (
              <Link to={`${LIST_PATH}/${next.id}`} className="church-news-detail__adjacent-link">
                {next.title}
              </Link>
            ) : (
              <span className="church-news-detail__adjacent-empty">다음글이 없습니다.</span>
            )}
          </div>
        </nav>

        <div className="church-news-detail__actions">
          <Link to={LIST_PATH} className="church-news-detail__list-button">
            목록
          </Link>
        </div>
      </article>
    </div>
  )
}

export default EventPhotoDetail
