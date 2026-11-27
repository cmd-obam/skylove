import { useEffect, useMemo, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiSearch } from 'react-icons/fi'
import { Link, useLocation } from 'react-router-dom'
import NewPostBadge from '@/components/board/NewPostBadge'
import PrayerCopyGuard from '@/components/prayer/PrayerCopyGuard'
import PrayerHero from '@/components/prayer/PrayerHero'
import PrayerStats from '@/components/prayer/PrayerStats'
import { PRAYER_PATH, PRAYER_WRITE_PATH, prayerDetailPath } from '@/data/prayerMenu'
import {
  PRAYER_CARD_CATEGORIES,
  filtersForStat,
  formatPrayerDate,
  prayerAuthorLabel,
  prayerListStat,
} from '@/services/prayer/present'
import {
  PRAYER_PAGE_SIZE,
  fetchPrayerFeed,
  fetchPrayerStats,
  togglePrayerParticipation,
} from '@/services/prayer/requests'
import './Prayer.css'

const CARD_PAGE_SIZE = 6

const PAGE_BUTTON_WINDOW = 5

const BOARD_TITLES = {
  together: '중보기도 게시판',
  praying: '개인기도 게시판',
  answered: '기도응답 완료 게시판',
}

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

function formatPrayerDateWords(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function PrayerListPage({ mode = 'board' }) {
  const location = useLocation()
  const openedBoard = location.state?.board === 'answered' ? 'answered' : 'praying'
  const openedFilters = filtersForStat(openedBoard)
  const manage = mode === 'manage'
  const [stats, setStats] = useState(null)
  const [statsStatus, setStatsStatus] = useState('loading')
  const [statsMessage, setStatsMessage] = useState('')
  const [rows, setRows] = useState([])
  const [listStatus, setListStatus] = useState('loading')
  const [listMessage, setListMessage] = useState('')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState(openedFilters.status)
  const [category, setCategory] = useState(openedFilters.category)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [joiningId, setJoiningId] = useState('')
  const pageSize = manage ? PRAYER_PAGE_SIZE : CARD_PAGE_SIZE

  const activeStat = prayerListStat(status, false, category)
  const boardTitle = BOARD_TITLES[activeStat] ?? '개인기도 게시판'
  const bucketCount =
    activeStat === 'together'
      ? stats?.togetherCount
      : activeStat === 'praying'
        ? stats?.prayingCount
        : activeStat === 'answered'
          ? stats?.answeredCount
          : null
  const bucketKnown = statsStatus === 'ready'
  const bucketEmpty = bucketCount === 0
  const categoryFiltered =
    (activeStat === 'praying' && category !== 'personal') || (activeStat === 'answered' && category !== '')
  const filtered = Boolean(query) || categoryFiltered
  const totalPages = !filtered && bucketKnown
    ? Math.max(1, Math.ceil((bucketCount ?? 0) / pageSize))
    : page + (rows.length === pageSize ? 1 : 0)
  const pageNumbers = useMemo(
    () => getVisiblePageNumbers(page, totalPages),
    [page, totalPages],
  )
  const canWriteBoard = activeStat === 'together' || activeStat === 'praying'
  const showWriteEmpty =
    listStatus === 'empty' && bucketKnown && bucketEmpty && canWriteBoard
  const showAnsweredEmpty = listStatus === 'empty' && bucketKnown && bucketEmpty && activeStat === 'answered'

  useEffect(() => {
    let cancelled = false

    async function loadStats() {
      const statsResult = await fetchPrayerStats()

      if (cancelled) {
        return
      }

      if (!statsResult.success) {
        setStats(null)
        setStatsStatus('error')
        setStatsMessage(statsResult.message)
        return
      }

      setStats(statsResult.stats)
      setStatsStatus('ready')
    }

    void loadStats()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPage() {
      setListStatus('loading')
      const result = await fetchPrayerFeed({
        status,
        category,
        query,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      })

      if (cancelled) {
        return
      }

      if (!result.success) {
        setRows([])
        setListStatus('error')
        setListMessage(result.message)
        return
      }

      setRows(result.rows)
      setListMessage('')
      setListStatus(result.rows.length === 0 ? 'empty' : 'ready')
    }

    void loadPage()

    return () => {
      cancelled = true
    }
  }, [page, status, category, query, pageSize])

  const handleStat = (stat) => {
    const next = filtersForStat(stat)
    setStatus(next.status)
    setCategory(next.category)
    setQuery('')
    setQueryInput('')
    setPage(1)
  }

  const handleChip = (id) => {
    if (activeStat === 'answered') {
      setCategory(id)
    } else {
      setCategory(id || 'personal')
    }
    setPage(1)
  }

  const handleSearch = (event) => {
    event.preventDefault()
    setQuery(queryInput.trim())
    setPage(1)
  }

  const handleJoin = async (prayer) => {
    if (joiningId || prayer.status === 'answered') {
      return
    }

    setJoiningId(prayer.id)
    const result = await togglePrayerParticipation(prayer.id)
    setJoiningId('')

    if (!result.success) {
      setListMessage(result.message)
      setListStatus('error')
      return
    }

    setRows((current) =>
      current.map((row) => {
        if (row.id !== prayer.id) {
          return row
        }

        return {
          ...row,
          viewerParticipating: result.participating,
          participantCount: Math.max(0, row.participantCount + (result.participating ? 1 : -1)),
        }
      }),
    )
  }

  const goToPage = (nextPage) => {
    setPage(Math.min(totalPages, Math.max(1, nextPage)))
  }

  return (
    <PrayerCopyGuard>
      <div className={`prayer-page prayer-page--board${manage ? ' prayer-page--manage' : ''}`}>
        <PrayerHero compact={manage} title={manage ? '중보기도 관리' : '중보기도'}>
          {manage ? (
            <>
              <p className="prayer-hero__text">공개와 비공개 기도 제목을 함께 관리합니다.</p>
              <Link className="prayer-back prayer-back--on-hero" to={PRAYER_PATH}>
                기도 나눔으로
              </Link>
            </>
          ) : null}
        </PrayerHero>
        <div className="prayer-page__inner">
          <PrayerStats
            stats={stats}
            status={statsStatus}
            message={statsMessage}
            filters={{ status, category }}
            onSelect={handleStat}
          />
          <section className={`prayer-board${manage ? '' : ' prayer-board--gallery'}`} aria-labelledby="prayer-board-title">
            <div className="prayer-board__heading">
              <h2 id="prayer-board-title" className="prayer-board__title">
                {boardTitle}
              </h2>
              {canWriteBoard ? (
                <Link className="prayer-button prayer-button--board" to={PRAYER_WRITE_PATH}>
                  기도 작성하기
                </Link>
              ) : null}
            </div>
            {manage ? null : (
              <div className="prayer-gallery__tools">
                {activeStat === 'together' ? <div /> : (
                  <div className="prayer-gallery__chips" role="group" aria-label="기도 카테고리">
                    <button
                      type="button"
                      className={`prayer-gallery__chip${(activeStat === 'answered' ? category === '' : category === 'personal') ? ' is-selected' : ''}`}
                      onClick={() => handleChip('')}
                    >
                      전체
                    </button>
                    {PRAYER_CARD_CATEGORIES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`prayer-gallery__chip${category === item.id ? ' is-selected' : ''}`}
                        onClick={() => handleChip(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
                <form className="prayer-gallery__search" onSubmit={handleSearch}>
                  <FiSearch aria-hidden="true" />
                  <input
                    value={queryInput}
                    onChange={(event) => setQueryInput(event.target.value)}
                    placeholder="기도 제목, 내용으로 검색"
                    aria-label="기도 제목, 내용으로 검색"
                  />
                </form>
                <span className="prayer-gallery__sort">최신순</span>
              </div>
            )}
            {manage ? (
            <div className="prayer-table-wrap">
              <table className="prayer-table">
                <colgroup>
                  <col className="prayer-table__col-no" />
                  <col className="prayer-table__col-title" />
                  <col className="prayer-table__col-author" />
                  <col className="prayer-table__col-date" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">번호</th>
                    <th scope="col">기도 제목</th>
                    <th scope="col">작성자</th>
                    <th scope="col">작성일</th>
                  </tr>
                </thead>
                <tbody>
                  {listStatus === 'loading' ? (
                    <tr>
                      <td colSpan={4} className="prayer-table__empty">
                        기도 제목을 불러오는 중입니다.
                      </td>
                    </tr>
                  ) : null}
                  {listStatus === 'error' ? (
                    <tr>
                      <td colSpan={4} className="prayer-table__empty prayer-table__empty--error">
                        {listMessage}
                      </td>
                    </tr>
                  ) : null}
                  {showWriteEmpty ? (
                    <tr>
                      <td colSpan={4} className="prayer-table__empty">
                        <p>현재 작성된 기도가 없습니다.</p>
                        <Link className="prayer-button" to={PRAYER_WRITE_PATH}>
                          기도 제목 작성하기
                        </Link>
                      </td>
                    </tr>
                  ) : null}
                  {showAnsweredEmpty ? (
                    <tr>
                      <td colSpan={4} className="prayer-table__empty">
                        기도 응답 완료된 내역이 없습니다.
                      </td>
                    </tr>
                  ) : null}
                  {listStatus === 'empty' && !showWriteEmpty && !showAnsweredEmpty && statsStatus !== 'loading' ? (
                    <tr>
                      <td colSpan={4} className="prayer-table__empty">
                        등록된 기도 제목이 없습니다.
                      </td>
                    </tr>
                  ) : null}
                  {listStatus === 'ready'
                    ? rows.map((prayer, index) => {
                        const number = bucketKnown
                          ? Math.max(1, bucketCount - (page - 1) * PRAYER_PAGE_SIZE - index)
                          : (page - 1) * PRAYER_PAGE_SIZE + index + 1

                        return (
                          <tr key={prayer.id}>
                            <td>{number}</td>
                            <td className="prayer-table__title">
                              <Link className="prayer-table__link" to={prayerDetailPath(prayer.id)}>
                                <NewPostBadge createdAt={prayer.createdAt} />
                                {prayer.title}
                              </Link>
                            </td>
                            <td className="prayer-table__author">{prayerAuthorLabel(prayer)}</td>
                            <td className="prayer-table__date">{formatPrayerDate(prayer.createdAt)}</td>
                          </tr>
                        )
                      })
                    : null}
                </tbody>
              </table>
            </div>
            ) : (
              <>
                {listStatus === 'loading' ? <p className="prayer-gallery__status">기도 제목을 불러오는 중입니다.</p> : null}
                {listStatus === 'error' ? <p className="prayer-gallery__status prayer-gallery__status--error">{listMessage}</p> : null}
                {showWriteEmpty ? (
                  <div className="prayer-gallery__status">
                    <p>현재 작성된 기도가 없습니다.</p>
                    <Link className="prayer-button" to={PRAYER_WRITE_PATH}>
                      기도 제목 작성하기
                    </Link>
                  </div>
                ) : null}
                {showAnsweredEmpty ? <p className="prayer-gallery__status">기도 응답 완료된 내역이 없습니다.</p> : null}
                {listStatus === 'empty' && !showWriteEmpty && !showAnsweredEmpty && statsStatus !== 'loading' ? (
                  <p className="prayer-gallery__status">등록된 기도 제목이 없습니다.</p>
                ) : null}
                {listStatus === 'ready' ? (
                  <div className="prayer-gallery__grid">
                    {rows.map((prayer) => {
                      const answered = prayer.status === 'answered'
                      return (
                        <article key={prayer.id} className="prayer-feed">
                          <div className="prayer-feed__top">
                            <Link className="prayer-feed__title" to={prayerDetailPath(prayer.id)}>
                              <h3>
                                <NewPostBadge createdAt={prayer.createdAt} />
                                {prayer.title}
                              </h3>
                            </Link>
                            <span className={`prayer-feed__badge${answered ? ' is-answered' : ''}`}>
                              {answered ? '응답 완료' : '진행 중'}
                            </span>
                          </div>
                          <Link className="prayer-feed__body" to={prayerDetailPath(prayer.id)}>
                            <p className="prayer-feed__author">{prayerAuthorLabel(prayer)}</p>
                            <p className="prayer-feed__date">{formatPrayerDateWords(prayer.createdAt)}</p>
                            <p className="prayer-feed__excerpt">{prayer.content}</p>
                          </Link>
                          <footer className="prayer-feed__footer">
                            <p>
                              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                                <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M12 19.2s-6-3.7-6-8.1A3.4 3.4 0 0 1 12 8a3.4 3.4 0 0 1 6 3.1c0 4.4-6 8.1-6 8.1z" />
                              </svg>
                              {answered
                                ? `${prayer.participantCount}명이 함께 기도했습니다.`
                                : `${prayer.participantCount}명이 기도하고 있습니다.`}
                            </p>
                            {answered ? (
                              <Link className="prayer-feed__action is-answered" to={prayerDetailPath(prayer.id)}>
                                응답 나눔 보기
                              </Link>
                            ) : (
                              <button
                                type="button"
                                className={`prayer-feed__action${prayer.viewerParticipating ? ' is-on' : ''}`}
                                onClick={() => handleJoin(prayer)}
                                disabled={joiningId === prayer.id}
                              >
                                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                                  <path fill={prayer.viewerParticipating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" d="M12 19.2s-6-3.7-6-8.1A3.4 3.4 0 0 1 12 8a3.4 3.4 0 0 1 6 3.1c0 4.4-6 8.1-6 8.1z" />
                                </svg>
                                함께 기도하기
                              </button>
                            )}
                          </footer>
                        </article>
                      )
                    })}
                  </div>
                ) : null}
              </>
            )}
            {listStatus === 'ready' && totalPages > 1 ? (
              <nav className="prayer-pagination" aria-label={`${boardTitle} 페이지`}>
                <button
                  type="button"
                  className="prayer-pagination__nav"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  aria-label="이전 페이지"
                >
                  <FiChevronLeft aria-hidden="true" />
                </button>
                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`prayer-pagination__page${pageNumber === page ? ' is-active' : ''}`}
                    onClick={() => goToPage(pageNumber)}
                    aria-current={pageNumber === page ? 'page' : undefined}
                    disabled={pageNumber === page}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  className="prayer-pagination__nav"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  aria-label="다음 페이지"
                >
                  <FiChevronRight aria-hidden="true" />
                </button>
              </nav>
            ) : null}
          </section>
        </div>
      </div>
    </PrayerCopyGuard>
  )
}

export default PrayerListPage
