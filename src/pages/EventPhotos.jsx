import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiFileText } from 'react-icons/fi'
import BoardPageHeader from '@/components/board/BoardPageHeader'
import BoardWriteButton from '@/components/board/BoardWriteButton'
import { EVENT_PHOTO_SEARCH_TYPES } from '@/data/eventPhotos'
import { fetchBoardPosts } from '@/services/board/posts'
import { formatBoardDate } from '@/utils/formatBoardDate'
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import './ChurchNews.css'

const LIST_PATH = '/church-news/album'

function matchesAlbumSearch(post, query, searchType) {
  if (!query) {
    return true
  }

  switch (searchType) {
    case 'title':
      return post.title?.includes(query) ?? false
    case 'content':
      return post.content?.includes(query) ?? false
    case 'author':
      return (post.writer?.includes(query) ?? false) || (post.author?.includes(query) ?? false)
    case 'title-content':
    default:
      return (
        (post.title?.includes(query) ?? false) || (post.content?.includes(query) ?? false)
      )
  }
}

function EventPhotos() {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('title-content')
  const [activeSearchType, setActiveSearchType] = useState('title-content')
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
    setActiveSearchType(searchType)
  }

  const filteredPosts = useMemo(
    () => posts.filter((post) => matchesAlbumSearch(post, searchQuery, activeSearchType)),
    [posts, searchQuery, activeSearchType],
  )

  return (
    <div className="church-news-page">
      <BoardPageHeader
        title="교회앨범"
        description="교회 행사와 다양한 활동 사진을 소개합니다."
        showDivider
      />

      <div className="event-photos-toolbar">
        <form className="event-photos-search" onSubmit={handleSearchSubmit} autoComplete="off">
          <label htmlFor="event-photos-search-type" className="visually-hidden">
            검색 조건
          </label>
          <select
            id="event-photos-search-type"
            className="event-photos-search__type"
            value={searchType}
            onChange={(event) => setSearchType(event.target.value)}
          >
            {EVENT_PHOTO_SEARCH_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label htmlFor="event-photos-search" className="visually-hidden">
            검색어
          </label>
          <input
            id="event-photos-search"
            type="search"
            className="event-photos-search__input"
            placeholder="검색어를 입력하세요."
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            autoComplete={AUTOCOMPLETE_OFF}
          />
          <button type="submit" className="event-photos-search__button">
            검색
          </button>
        </form>
        <BoardWriteButton to="/album/write" buttonClassName="event-photos-search__button" />
      </div>

      {loading ? (
        <div className="event-photos-empty">
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
            const thumbnail = post.thumbnail || post.images?.[0]?.src

            return (
              <li key={post.id} className="event-photos-grid__item">
                <Link to={`${LIST_PATH}/${post.id}`} className="event-photos-card">
                  <div className="event-photos-card__image-wrap">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={post.images?.[0]?.alt || post.title}
                        className="event-photos-card__image"
                      />
                    ) : (
                      <div className="event-photos-card__placeholder" aria-hidden="true">
                        <FiFileText className="event-photos-card__placeholder-icon" />
                      </div>
                    )}
                  </div>
                  <div className="event-photos-card__body">
                    <h2 className="event-photos-card__title">{post.title}</h2>
                    <p className="event-photos-card__meta">
                      <span>{formatBoardDate(post.date)}</span>
                      <span className="event-photos-card__meta-divider" aria-hidden="true">
                        |
                      </span>
                      <span>조회 {post.views}</span>
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <nav className="church-news-board__pagination" aria-label="게시판 페이지">
        <button
          type="button"
          className="church-news-board__page church-news-board__page--active"
          aria-current="page"
        >
          1
        </button>
      </nav>
    </div>
  )
}

export default EventPhotos
