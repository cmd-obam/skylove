import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiFileText, FiHeart } from 'react-icons/fi'
import Breadcrumb from '@/components/Breadcrumb'
import BoardWriteButton from '@/components/board/BoardWriteButton'
import BoardPostTitle from '@/components/board/BoardPostTitle'
import churchPlaceholder from '@/assets/images/home/welcome-church-exterior.png'
import { useBoardPostList } from '@/hooks/useBoardPostList'
import { getAlbumThumbnailSrc } from '@/utils/albumThumbnail'
import { formatBoardDate } from '@/utils/formatBoardDate'
import { getPostAuthor } from '@/utils/getPostAuthor'
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import './ChurchNews.css'

const LIST_PATH = '/church-news/album'

function EventPhotos() {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const { posts, loading } = useBoardPostList('album')

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setSearchQuery(searchKeyword.trim())
  }

  const filteredPosts = useMemo(() => {
    if (!searchQuery) {
      return posts
    }

    return posts.filter((post) => post.title?.includes(searchQuery))
  }, [posts, searchQuery])

  return (
    <div className="church-news-page">
      <header className="sub-layout__header">
        <div className="sub-layout__heading">
          <h1 className="sub-layout__title">교회앨범</h1>
          <p className="sub-layout__subtitle">교회 행사와 다양한 활동 사진을 소개합니다.</p>
        </div>
        <Breadcrumb />
      </header>

      <div className="church-news-board__toolbar">
        <form className="church-news-board__search" onSubmit={handleSearchSubmit} autoComplete="off">
          <label htmlFor="event-photos-search" className="visually-hidden">
            제목 검색
          </label>
          <input
            id="event-photos-search"
            type="search"
            className="church-news-board__search-input"
            placeholder="제목 검색"
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            autoComplete={AUTOCOMPLETE_OFF}
          />
          <button type="submit" className="church-news-board__search-button">
            검색
          </button>
        </form>
        <BoardWriteButton to="/album/write" postType="album" />
      </div>

      {loading ? (
        <div className="event-photos-empty" role="status">
          <span>불러오는 중...</span>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="event-photos-empty">
          <FiFileText className="event-photos-empty__icon" aria-hidden="true" />
          <span>등록된 게시글이 없습니다.</span>
        </div>
      ) : (
        <ul className="event-photos-grid">
          {filteredPosts.map((post) => {
            const thumbnailSrc = getAlbumThumbnailSrc(post, churchPlaceholder)

            return (
              <li key={post.id} className="event-photos-grid__item">
                <Link to={`${LIST_PATH}/${post.id}`} className="event-photos-card">
                  <div className="event-photos-card__image-wrap">
                    <img
                      src={thumbnailSrc}
                      alt={post.images?.[0]?.alt || `${post.title} 대표 이미지`}
                      className="event-photos-card__image"
                      loading="lazy"
                    />
                  </div>
                  <div className="event-photos-card__body">
                    <h2 className="event-photos-card__title">
                      <BoardPostTitle
                        title={post.title}
                        commentsCount={post.commentsCount}
                        hasImage={Boolean(post.hasImage || post.thumbnail)}
                      />
                    </h2>
                    <p className="event-photos-card__meta">
                      <span>작성자 : {getPostAuthor(post)}</span>
                      <span className="event-photos-card__meta-divider" aria-hidden="true">
                        ·
                      </span>
                      <time dateTime={post.createdAt || post.date}>
                        {formatBoardDate(post.date || post.createdAt)}
                      </time>
                      <span className="event-photos-card__meta-divider" aria-hidden="true">
                        ·
                      </span>
                      <span className="event-photos-card__likes">
                        <FiHeart aria-hidden="true" />
                        <span>{post.likesCount ?? 0}</span>
                      </span>
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default EventPhotos
