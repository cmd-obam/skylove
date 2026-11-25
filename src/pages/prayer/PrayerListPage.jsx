import { useEffect, useMemo, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import PrayerCopyGuard from '@/components/prayer/PrayerCopyGuard'
import PrayerHero from '@/components/prayer/PrayerHero'
import PrayerStats from '@/components/prayer/PrayerStats'
import { PRAYER_PATH, PRAYER_WRITE_PATH, prayerDetailPath } from '@/data/prayerMenu'
import { filtersForStat, formatPrayerDate, prayerAuthorLabel, prayerListStat } from '@/services/prayer/present'
import { PRAYER_PAGE_SIZE, fetchPrayerFeed, fetchPrayerStats } from '@/services/prayer/requests'
import './Prayer.css'

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

function PrayerListPage({ mode = 'board' }) {
  const manage = mode === 'manage'
  const [stats, setStats] = useState(null)
  const [statsStatus, setStatsStatus] = useState('loading')
  const [statsMessage, setStatsMessage] = useState('')
  const [rows, setRows] = useState([])
  const [listStatus, setListStatus] = useState('loading')
  const [listMessage, setListMessage] = useState('')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('praying')
  const [withParticipants, setWithParticipants] = useState(false)

  const activeStat = prayerListStat(status, withParticipants)
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
  const totalPages = bucketKnown
    ? Math.max(1, Math.ceil((bucketCount ?? 0) / PRAYER_PAGE_SIZE))
    : page + (rows.length === PRAYER_PAGE_SIZE ? 1 : 0)
  const pageNumbers = useMemo(
    () => getVisiblePageNumbers(page, totalPages),
    [page, totalPages],
  )
  const showWriteEmpty =
    listStatus === 'empty' && bucketKnown && bucketEmpty && (activeStat === 'together' || activeStat === 'praying')
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
        withParticipants,
        limit: PRAYER_PAGE_SIZE,
        offset: (page - 1) * PRAYER_PAGE_SIZE,
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
  }, [page, status, withParticipants])

  const handleStat = (stat) => {
    const next = filtersForStat(stat)
    setStatus(next.status)
    setWithParticipants(next.withParticipants)
    setPage(1)
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
          <div className="prayer-hero__actions">
            <Link className="prayer-button prayer-button--hero" to={PRAYER_WRITE_PATH}>
              기도 제목 작성하기
            </Link>
          </div>
        </PrayerHero>
        <div className="prayer-page__inner">
          <PrayerStats
            stats={stats}
            status={statsStatus}
            message={statsMessage}
            filters={{ status, withParticipants }}
            onSelect={handleStat}
          />
          <section className="prayer-board" aria-labelledby="prayer-board-title">
            <h2 id="prayer-board-title" className="prayer-board__title">
              {boardTitle}
            </h2>
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
