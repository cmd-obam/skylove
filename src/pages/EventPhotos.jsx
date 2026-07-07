import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiFileText } from 'react-icons/fi'
import Breadcrumb from '@/components/Breadcrumb'
import BoardWriteButton from '@/components/board/BoardWriteButton'
import churchPlaceholder from '@/assets/images/home/welcome-church-exterior.png'
import { fetchBoardPosts } from '@/services/board/posts'
import { getAlbumThumbnailSrc } from '@/utils/albumThumbnail'
import { formatBoardDate } from '@/utils/formatBoardDate'
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import './ChurchNews.css'

const LIST_PATH = '/church-news/album'

function EventPhotos() {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadPosts() {
      const result = await fetchBoardPosts('album')

      if (isMounted) {
        setPosts(result.posts ?? [])
        setLoading(false)
      }
    }

    loadPosts()

    return () => {
      isMounted = false
    }
  }, [])

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
      <header className="church-news-page__header">
        <div className="church-news-page__heading">
          <h1 className="church-news-page__title">교회앨범</h1>
          <p className="church-news-page__description">교회 행사와 다양한 활동 사진을 소개합니다.</p>
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
        <BoardWriteButton to="/album/write" />
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
                    <h2 className="event-photos-card__title">{post.title}</h2>
                    <p className="event-photos-card__meta">
                      <span>{formatBoardDate(post.date)}</span>
                      <span className="event-photos-card__meta-divider" aria-hidden="true">
                        ·
                      </span>
                      <span>조회 {post.views ?? 0}</span>
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
