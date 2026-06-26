import { useState } from 'react'
import { FiFileText } from 'react-icons/fi'
import Breadcrumb from '@/components/Breadcrumb'
import './ChurchNews.css'

const POSTS = []

function ChurchNews() {
  const [searchKeyword, setSearchKeyword] = useState('')

  const handleSearchSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <div className="church-news-page">
      <header className="church-news-page__header">
        <div className="church-news-page__heading">
          <h1 className="church-news-page__title">교회소식</h1>
          <p className="church-news-page__description">하늘사랑교회의 새로운 소식을 전합니다.</p>
        </div>
        <Breadcrumb />
      </header>

      <section className="church-news-board" aria-label="교회소식 게시판">
        <div className="church-news-board__toolbar">
          <form className="church-news-board__search" onSubmit={handleSearchSubmit}>
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
            />
            <button type="submit" className="church-news-board__search-button">
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
              {POSTS.length === 0 ? (
                <tr>
                  <td colSpan={4} className="church-news-board__empty">
                    <div className="church-news-board__empty-inner">
                      <FiFileText className="church-news-board__empty-icon" aria-hidden="true" />
                      <span>등록된 게시글이 없습니다.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                POSTS.map((post) => (
                  <tr key={post.id}>
                    <td>{post.no}</td>
                    <td className="church-news-board__post-title">{post.title}</td>
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
      </section>
    </div>
  )
}

export default ChurchNews
