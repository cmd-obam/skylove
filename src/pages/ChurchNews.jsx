import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiFileText } from 'react-icons/fi'
import Breadcrumb from '@/components/Breadcrumb'
import BoardWriteButton from '@/components/board/BoardWriteButton'
import { useBoardPostList } from '@/hooks/useBoardPostList'
import { formatBoardDate } from '@/utils/formatBoardDate'
import { formatBoardPostTitle } from '@/utils/formatBoardPostTitle'
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import './ChurchNews.css'

const LIST_PATH = '/church-news'

function ChurchNews() {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const { posts, loading } = useBoardPostList('church_news')

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
          <h1 className="sub-layout__title">교회소식</h1>
          <p className="sub-layout__subtitle">하늘사랑교회의 새로운 소식을 전합니다.</p>
        </div>
        <Breadcrumb />
      </header>

      <div className="church-news-board__toolbar">
        <form className="church-news-board__search" onSubmit={handleSearchSubmit} autoComplete="off">
          <label htmlFor="church-news-search" className="visually-hidden">
            제목 검색
          </label>
          <input
            id="church-news-search"
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
        <BoardWriteButton to="/news/write" />
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
                      {formatBoardPostTitle(post.title, post.commentsCount)}
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

export default ChurchNews
