import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiFileText } from 'react-icons/fi'
import Breadcrumb from '@/components/Breadcrumb'
import {
  EVENT_PHOTO_POSTS,
  EVENT_PHOTO_SEARCH_TYPES,
  matchesEventPhotoSearch,
} from '@/data/eventPhotos'
import './ChurchNews.css'

const LIST_PATH = '/church-news/album'

function EventPhotos() {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('title-content')
  const [activeSearchType, setActiveSearchType] = useState('title-content')

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setSearchQuery(searchKeyword.trim())
    setActiveSearchType(searchType)
  }

  const filteredPosts = EVENT_PHOTO_POSTS.filter((post) =>
    matchesEventPhotoSearch(post, searchQuery, activeSearchType),
  )

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

      <div className="event-photos-toolbar">
        <form className="event-photos-search" onSubmit={handleSearchSubmit}>
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
          />
          <button type="submit" className="event-photos-search__button">
            검색
          </button>
        </form>
      </div>

      <div className="church-news-board__table-wrap">
        <table className="church-news-board__table">
          <colgroup>
            <col className="church-news-board__col-no" />
            <col className="church-news-board__col-title" />
            <col className="church-news-board__col-date" />
            <col className="church-news-board__col-views" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">번호</th>
              <th scope="col">제목</th>
              <th scope="col" className="church-news-board__col-date-header">
                작성일
              </th>
              <th scope="col" className="church-news-board__col-views-header">
                조회
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPosts.length === 0 ? (
              <tr>
                <td colSpan={4} className="church-news-board__empty">
                  <div className="church-news-board__empty-inner">
                    <FiFileText className="church-news-board__empty-icon" aria-hidden="true" />
                    <span>등록된 게시글이 없습니다.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPosts.map((post) => (
                <tr key={post.id}>
                  <td>{post.no}</td>
                  <td className="church-news-board__post-title">
                    <Link
                      to={`${LIST_PATH}/${post.id}`}
                      className="church-news-board__post-link"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="church-news-board__col-date-cell">{post.date}</td>
                  <td className="church-news-board__col-views-cell">{post.views}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
