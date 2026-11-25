import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '@/components/common/Modal'
import PrayerCard from '@/components/prayer/PrayerCard'
import PrayerCopyGuard from '@/components/prayer/PrayerCopyGuard'
import PrayerFilters from '@/components/prayer/PrayerFilters'
import PrayerHero from '@/components/prayer/PrayerHero'
import PrayerStats from '@/components/prayer/PrayerStats'
import { PRAYER_PATH, PRAYER_WRITE_PATH } from '@/data/prayerMenu'
import { filtersForStat, prayerListStat } from '@/services/prayer/present'
import {
  PRAYER_PAGE_SIZE,
  deletePrayerRequest,
  fetchPrayerAccess,
  fetchPrayerFeed,
  fetchPrayerStats,
  togglePrayerParticipation,
} from '@/services/prayer/requests'
import './Prayer.css'

function PrayerListPage({ mode = 'board' }) {
  const manage = mode === 'manage'
  const [access, setAccess] = useState({ canViewPrivate: false, isSuperAdmin: false })
  const [stats, setStats] = useState(null)
  const [statsStatus, setStatsStatus] = useState('loading')
  const [statsMessage, setStatsMessage] = useState('')
  const [rows, setRows] = useState([])
  const [listStatus, setListStatus] = useState('loading')
  const [listMessage, setListMessage] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [pendingId, setPendingId] = useState(null)
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('praying')
  const [withParticipants, setWithParticipants] = useState(false)
  const [visibility, setVisibility] = useState('all')
  const [keyword, setKeyword] = useState('')
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  const showVisibility = manage || access.canViewPrivate
  const requestVisibility = showVisibility ? visibility : 'all'
  const activeStat = prayerListStat(status, withParticipants)
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
  const showWriteEmpty =
    listStatus === 'empty' && bucketKnown && bucketEmpty && (activeStat === 'together' || activeStat === 'praying')
  const showAnsweredEmpty = listStatus === 'empty' && bucketKnown && bucketEmpty && activeStat === 'answered'
  const showFilteredEmpty = listStatus === 'empty' && !showWriteEmpty && !showAnsweredEmpty && statsStatus !== 'loading'
  const feedFilters = {
    category,
    status,
    visibility: requestVisibility,
    query,
    withParticipants,
  }

  useEffect(() => {
    let cancelled = false

    async function loadAccessAndStats() {
      const [accessResult, statsResult] = await Promise.all([fetchPrayerAccess(), fetchPrayerStats()])

      if (cancelled) {
        return
      }

      if (accessResult.success) {
        setAccess(accessResult.access)
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

    void loadAccessAndStats()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadFirstPage() {
      const result = await fetchPrayerFeed({
        category,
        status,
        visibility: requestVisibility,
        query,
        withParticipants,
        limit: PRAYER_PAGE_SIZE,
        offset: 0,
      })

      if (cancelled) {
        return
      }

      if (!result.success) {
        setRows([])
        setHasMore(false)
        setListStatus('error')
        setListMessage(result.message)
        return
      }

      setRows(result.rows)
      setHasMore(result.rows.length === PRAYER_PAGE_SIZE)
      setOffset(0)
      setListMessage('')
      setListStatus(result.rows.length === 0 ? 'empty' : 'ready')
    }

    void loadFirstPage()

    return () => {
      cancelled = true
    }
  }, [category, query, requestVisibility, status, withParticipants])

  const handleStat = (stat) => {
    const next = filtersForStat(stat)
    setStatus(next.status)
    setWithParticipants(next.withParticipants)
  }

  const handleToggle = async (prayer) => {
    setPendingId(prayer.id)
    const result = await togglePrayerParticipation(prayer.id)
    setPendingId(null)

    if (!result.success) {
      setListMessage(result.message)
      return
    }

    const delta = result.participating === prayer.viewerParticipating ? 0 : result.participating ? 1 : -1
    setRows((current) =>
      current.map((row) =>
        row.id === prayer.id
          ? {
              ...row,
              viewerParticipating: result.participating,
              participantCount: Math.max(0, row.participantCount + delta),
            }
          : row,
      ),
    )
    const statsResult = await fetchPrayerStats()

    if (statsResult.success) {
      setStats(statsResult.stats)
      setStatsStatus('ready')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setDeleteError('')
    const result = await deletePrayerRequest(deleteTarget.id)

    if (!result.success) {
      setDeleteError(result.message)
      return
    }

    setDeleteTarget(null)
    setListStatus('loading')
    setStatsStatus('loading')
    const [listResult, statsResult] = await Promise.all([
      fetchPrayerFeed({ ...feedFilters, limit: PRAYER_PAGE_SIZE, offset: 0 }),
      fetchPrayerStats(),
    ])

    if (listResult.success) {
      setRows(listResult.rows)
      setHasMore(listResult.rows.length === PRAYER_PAGE_SIZE)
      setOffset(0)
      setListMessage('')
      setListStatus(listResult.rows.length === 0 ? 'empty' : 'ready')
    } else {
      setListStatus('error')
      setListMessage(listResult.message)
    }

    if (statsResult.success) {
      setStats(statsResult.stats)
      setStatsStatus('ready')
    } else {
      setStatsStatus('error')
      setStatsMessage(statsResult.message)
    }
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
          <section className="prayer-board" aria-label="기도 목록">
          <PrayerFilters
            category={category}
            status={status}
            visibility={visibility}
            showVisibility={showVisibility}
            keyword={keyword}
            onCategoryChange={setCategory}
            onStatusChange={(nextStatus) => {
              setStatus(nextStatus)
              setWithParticipants(false)
            }}
            onVisibilityChange={setVisibility}
            onKeywordChange={setKeyword}
            onSearch={(event) => {
              event.preventDefault()
              setQuery(keyword.trim())
            }}
          />
          {listStatus === 'loading' ? <p className="prayer-status prayer-status--card">기도 제목을 불러오는 중입니다.</p> : null}
          {listMessage && listStatus !== 'loading' ? (
            <p className="prayer-status prayer-status--card prayer-status--error">{listMessage}</p>
          ) : null}
          {showWriteEmpty ? (
            <div className="prayer-empty">
              <p className="prayer-status prayer-status--card">현재 작성된 기도가 없습니다.</p>
              <Link className="prayer-button" to={PRAYER_WRITE_PATH}>
                기도 제목 작성하기
              </Link>
            </div>
          ) : null}
          {showAnsweredEmpty ? (
            <p className="prayer-status prayer-status--card">기도 응답 완료된 내역이 없습니다.</p>
          ) : null}
          {showFilteredEmpty ? (
            <p className="prayer-status prayer-status--card">조건에 맞는 기도 제목이 없습니다.</p>
          ) : null}
          {listStatus === 'ready' || listStatus === 'loading-more' ? (
            <div className="prayer-list">
              {rows.map((prayer) => (
                <PrayerCard
                  key={prayer.id}
                  prayer={prayer}
                  pending={pendingId === prayer.id}
                  onToggle={handleToggle}
                  onDelete={setDeleteTarget}
                  showManage={manage}
                />
              ))}
            </div>
          ) : null}
          {hasMore ? (
            <div className="prayer-toolbar">
              <button
                type="button"
                className="prayer-button prayer-button--ghost"
                disabled={listStatus === 'loading-more'}
                onClick={async () => {
                  setListStatus('loading-more')
                  const result = await fetchPrayerFeed({
                    ...feedFilters,
                    limit: PRAYER_PAGE_SIZE,
                    offset: offset + PRAYER_PAGE_SIZE,
                  })

                  if (!result.success) {
                    setListStatus('ready')
                    setListMessage(result.message)
                    return
                  }

                  setRows((current) => [...current, ...result.rows])
                  setHasMore(result.rows.length === PRAYER_PAGE_SIZE)
                  setOffset((current) => current + PRAYER_PAGE_SIZE)
                  setListStatus('ready')
                }}
              >
                {listStatus === 'loading-more' ? '불러오는 중' : '더 보기'}
              </button>
            </div>
          ) : null}
          </section>
        </div>
        <Modal
          isOpen={Boolean(deleteTarget)}
          title="기도 제목을 삭제할까요?"
          onClose={() => {
            setDeleteTarget(null)
            setDeleteError('')
          }}
        >
          <p>{deleteTarget ? `「${deleteTarget.title}」 기도 제목과 참여 기록을 삭제합니다.` : ''}</p>
          {deleteError ? <p className="prayer-status prayer-status--error">{deleteError}</p> : null}
          <div className="prayer-inline-actions">
            <button type="button" className="prayer-button prayer-button--danger" onClick={handleDelete}>
              삭제
            </button>
            <button
              type="button"
              className="prayer-button prayer-button--ghost"
              onClick={() => setDeleteTarget(null)}
            >
              취소
            </button>
          </div>
        </Modal>
      </div>
    </PrayerCopyGuard>
  )
}

export default PrayerListPage
