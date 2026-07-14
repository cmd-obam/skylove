import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiFileText, FiHeart, FiUser } from 'react-icons/fi'
import Breadcrumb from '@/components/Breadcrumb'
import BoardWriteButton from '@/components/board/BoardWriteButton'
import { useBoardPostList } from '@/hooks/useBoardPostList'
import { getWorshipWordBoard } from '@/data/worshipWord'
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import '@/pages/ChurchNews.css'
import './WorshipWord.css'

function WorshipWordList({ boardKey }) {
  const board = getWorshipWordBoard(boardKey)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const { posts, loading } = useBoardPostList(board.postType)

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
        <ul className="worship-word-grid">
          {filteredPosts.map((post) => (
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
                  <p className="worship-word-card__likes">
                    <FiHeart aria-hidden="true" />
                    <span>{post.likesCount ?? 0}</span>
                  </p>
                  <p className="worship-word-card__author">
                    <span className="worship-word-card__avatar" aria-hidden="true">
                      <FiUser />
                    </span>
                    <span>{post.authorName || post.writer || '관리자'}</span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default WorshipWordList
