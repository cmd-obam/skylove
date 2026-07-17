import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiChevronLeft, FiChevronRight, FiFileText, FiHeart } from 'react-icons/fi'
import Breadcrumb from '@/components/Breadcrumb'
import BoardWriteButton from '@/components/board/BoardWriteButton'
import { useBoardPostList } from '@/hooks/useBoardPostList'
import useIsMobile from '@/hooks/useIsMobile'
import { getWorshipWordBoard } from '@/data/worshipWord'
import { formatBoardDate } from '@/utils/formatBoardDate'
import { getPostAuthor } from '@/utils/getPostAuthor'
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import '@/pages/ChurchNews.css'
import './WorshipWord.css'

const PAGE_SIZE_DESKTOP = 12
const PAGE_SIZE_MOBILE = 5
const PAGE_BUTTON_WINDOW = 5

function getVisiblePageNumbers(currentPage, totalPages, windowSize = PAGE_BUTTON_WINDOW) {
  if (totalPages <= windowSize) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  let start = Math.max(1, currentPage - Math.floor(windowSize / 2))
  let end = start + windowSize - 1

  if (end > totalPages) {
    end = totalPages
    start = Math.max(1, end - windowSize + 1)
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function WorshipWordList({ boardKey }) {
  const board = getWorshipWordBoard(boardKey)
  const isMobile = useIsMobile()
  const pageSize = isMobile ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const { posts, loading } = useBoardPostList(board.postType)

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setSearchQuery(searchKeyword.trim())
    setCurrentPage(1)
  }

  const filteredPosts = useMemo(() => {
    if (!searchQuery) {
      return posts
    }

    return posts.filter((post) => post.title?.includes(searchQuery))
  }, [posts, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / pageSize))

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages, pageSize])

  const pagedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredPosts.slice(startIndex, startIndex + pageSize)
  }, [filteredPosts, currentPage, pageSize])

  const pageNumbers = useMemo(
    () => getVisiblePageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  )

  const showPagination = !loading && filteredPosts.length > 0 && totalPages > 1

  return (
    <div className="church-news-page worship-word-page">
      <header className="sub-layout__header">
        <div className="sub-layout__heading">
          <h1 className="sub-layout__title">{board.title}</h1>
          <p className="sub-layout__subtitle">{board.description}</p>
        </div>
        <Breadcrumb />
      </header>

      <div className="church-news-board__toolbar">
        <form
          className="church-news-board__search"
          onSubmit={handleSearchSubmit}
          autoComplete="off"
        >
          <label htmlFor={`worship-word-search-${board.key}`} className="visually-hidden">
            제목 검색
          </label>
          <input
            id={`worship-word-search-${board.key}`}
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
        <BoardWriteButton to={board.writePath} />
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
        <>
          <ul className="worship-word-grid">
            {pagedPosts.map((post) => (
              <li key={post.id} className="worship-word-grid__item">
                <Link to={`${board.listPath}/${post.id}`} className="worship-word-card">
                  <div className="worship-word-card__image-wrap">
                    {post.thumbnail ? (
                      <img
                        src={post.thumbnail}
                        alt={`${post.title} 썸네일`}
                        className="worship-word-card__image"
                        loading="lazy"
                      />
                    ) : (
                      <div className="worship-word-card__placeholder" aria-hidden="true">
                        <span>영상</span>
                      </div>
                    )}
                  </div>
                  <div className="worship-word-card__body">
                    <h2 className="worship-word-card__title">{post.title}</h2>
                    <p className="worship-word-card__meta">
                      <span>{getPostAuthor(post)}</span>
                      <span className="worship-word-card__meta-sep" aria-hidden="true">
                        ·
                      </span>
                      <time dateTime={post.createdAt || post.date}>
                        {formatBoardDate(post.date || post.createdAt)}
                      </time>
                      <span className="worship-word-card__meta-sep" aria-hidden="true">
                        ·
                      </span>
                      <span className="worship-word-card__likes">
                        <FiHeart aria-hidden="true" />
                        <span>{post.likesCount ?? 0}</span>
                      </span>
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {showPagination ? (
            <nav className="church-news-board__pagination worship-word-pagination" aria-label="게시판 페이지">
              <button
                type="button"
                className="church-news-board__page worship-word-pagination__nav"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                aria-label="이전 페이지"
              >
                <FiChevronLeft aria-hidden="true" />
              </button>

              {pageNumbers.map((pageNumber) => {
                const isActive = pageNumber === currentPage

                return (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`church-news-board__page${
                      isActive ? ' church-news-board__page--active' : ''
                    }`}
                    onClick={() => setCurrentPage(pageNumber)}
                    aria-current={isActive ? 'page' : undefined}
                    disabled={isActive}
                  >
                    {pageNumber}
                  </button>
                )
              })}

              <button
                type="button"
                className="church-news-board__page worship-word-pagination__nav"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                aria-label="다음 페이지"
              >
                <FiChevronRight aria-hidden="true" />
              </button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  )
}

export default WorshipWordList
