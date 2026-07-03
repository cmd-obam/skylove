import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiFileText } from 'react-icons/fi'
import Breadcrumb from '@/components/Breadcrumb'
import BoardWriteButton from '@/components/board/BoardWriteButton'
import { fetchBoardPosts } from '@/services/board/posts'
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
            {loading ? (
              <tr>
                <td colSpan={4} className="church-news-board__empty">
                  <div className="church-news-board__empty-inner">
                    <span>불러오는 중...</span>
                  </div>
                </td>
              </tr>
            ) : filteredPosts.length === 0 ? (
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
                    <Link to={`${LIST_PATH}/${post.id}`} className="church-news-board__post-link">
                      {post.title}
                    </Link>
                  </td>
                  <td className="church-news-board__col-date-cell">{formatBoardDate(post.date)}</td>
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
