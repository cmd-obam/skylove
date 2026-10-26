import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  fetchIpVisitDetail,
  fetchIpVisitList,
  fetchIpVisitOverview,
  updateIpVisitRetention,
} from '@/services/analytics/ipVisitAdmin'
import { formatVisitDateTime } from '@/services/analytics/visitorStatsAdmin'
import { resolveAnalyticsRange } from '@/services/analytics/siteAnalyticsAdmin'
import { getAnalyticsPathLabel } from '@/utils/analyticsPathLabel'
import { getReferralSourceLabel } from '@/utils/visitReferral'
import { formatVisitorCount, getKoreaDateString } from '@/utils/visitorDate'

const PERIOD_OPTIONS = [
  { id: 'today', label: '오늘' },
  { id: 'yesterday', label: '어제' },
  { id: '7d', label: '최근 7일' },
  { id: '30d', label: '최근 30일' },
  { id: '90d', label: '최근 90일' },
  { id: 'custom', label: '직접 선택' },
]

const AUDIENCE_OPTIONS = [
  { id: 'all', label: '전체' },
  { id: 'member', label: '회원' },
  { id: 'guest', label: '비회원' },
]

const SORT_OPTIONS = [
  { id: 'total', label: '누적 접속 횟수' },
  { id: 'today', label: '오늘 접속 횟수' },
  { id: 'last', label: '마지막 접속' },
  { id: 'first', label: '최초 접속' },
]

const RETENTION_OPTIONS = [30, 90, 180, 365]
const PAGE_SIZE = 20
const EVENT_PAGE_SIZE = 50

function displayText(value, emptyLabel = '기록 없음') {
  const text = String(value ?? '').trim()
  return text || emptyLabel
}

function audienceLabel(row) {
  const parts = []
  if (row.has_member) {
    parts.push(row.member_labels ? `회원 ${row.member_labels}` : '회원')
  }
  if (row.has_guest) {
    parts.push('비회원')
  }
  return parts.join(' · ') || '기록 없음'
}

function memberEventLabel(event) {
  if (!event?.is_member) return '비회원'
  const name = event.member_name || '이름 기록 없음'
  const username = event.member_username || '아이디 기록 없음'
  const userId = event.user_id || '고유 ID 기록 없음'
  const nickname = event.member_nickname ? ` · 닉네임 ${event.member_nickname}` : ''
  return `${name} (${username})${nickname} · ${userId}`
}

function IpVisitDetail({ detail, loading, error, page, onPage, onClose }) {
  if (typeof document === 'undefined') return null

  const events = Array.isArray(detail?.events) ? detail.events : []
  const daily = Array.isArray(detail?.daily) ? detail.daily : []
  const eventTotal = Number(detail?.event_total || 0)
  const pageCount = Math.max(1, Math.ceil(eventTotal / EVENT_PAGE_SIZE))

  return createPortal(
    <div className="ip-visit-modal" role="presentation" onClick={onClose}>
      <div
        className="ip-visit-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ip-visit-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="ip-visit-detail-title">IP 접속 이력</h3>
        <p className="ip-visit-panel__note">
          같은 IP라도 서로 다른 회원은 각 접속 당시의 계정으로 따로 표시합니다. IP만으로 신원을 확인한 것이 아닙니다.
        </p>
        {loading ? <p>불러오는 중...</p> : null}
        {error ? <p className="ip-visit-panel__error" role="alert">{error}</p> : null}
        {detail ? (
          <>
            <dl className="ip-visit-detail__facts">
              <div><dt>IP 주소</dt><dd>{displayText(detail.ip_address)}</dd></div>
              <div><dt>최초 접속</dt><dd>{detail.first_seen ? formatVisitDateTime(detail.first_seen) : '기록 없음'}</dd></div>
              <div><dt>마지막 접속</dt><dd>{detail.last_seen ? formatVisitDateTime(detail.last_seen) : '기록 없음'}</dd></div>
              <div><dt>전체 접속 횟수</dt><dd>{formatVisitorCount(detail.total_hits)}</dd></div>
              <div><dt>오늘 접속 횟수</dt><dd>{formatVisitorCount(detail.today_hits)}</dd></div>
              <div><dt>선택 기간 접속</dt><dd>{formatVisitorCount(detail.range_hits)}</dd></div>
            </dl>
            <h4>날짜별 접속 횟수</h4>
            {daily.length === 0 ? <p>기록 없음</p> : (
              <ul className="ip-visit-detail__daily">
                {daily.map((item) => (
                  <li key={item.visit_date}>{item.visit_date} · {formatVisitorCount(item.hits)}회</li>
                ))}
              </ul>
            )}
            <h4>개별 방문 기록</h4>
            {events.length === 0 ? <p>기록 없음</p> : (
              <ol className="ip-visit-detail__events">
                {events.map((event) => (
                  <li key={event.id}>
                    <strong>{event.visited_at ? formatVisitDateTime(event.visited_at) : '기록 없음'}</strong>
                    <span>{getAnalyticsPathLabel(event.path)} ({displayText(event.path)})</span>
                    <span>유입 {event.referral_source ? getReferralSourceLabel(event.referral_source) : '기록 없음'}</span>
                    <span>참조 {displayText(event.referral_raw)}</span>
                    <span>{memberEventLabel(event)}</span>
                  </li>
                ))}
              </ol>
            )}
            {eventTotal > EVENT_PAGE_SIZE ? (
              <div className="ip-visit-panel__pager">
                <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1}>이전</button>
                <span>{page} / {pageCount}</span>
                <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pageCount}>다음</button>
              </div>
            ) : null}
          </>
        ) : null}
        <button type="button" className="ip-visit-panel__button" onClick={onClose}>닫기</button>
      </div>
    </div>,
    document.body,
  )
}

function IpVisitPanel() {
  const today = getKoreaDateString()
  const [period, setPeriod] = useState('today')
  const [customFrom, setCustomFrom] = useState(today)
  const [customTo, setCustomTo] = useState(today)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [audience, setAudience] = useState('all')
  const [sort, setSort] = useState('total')
  const [page, setPage] = useState(1)
  const [overview, setOverview] = useState(null)
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedIp, setSelectedIp] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailPage, setDetailPage] = useState(1)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [retentionMessage, setRetentionMessage] = useState('')

  const range = useMemo(
    () => resolveAnalyticsRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  )
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      const [overviewResult, listResult] = await Promise.all([
        fetchIpVisitOverview(),
        fetchIpVisitList({
          from: range.from,
          to: range.to,
          search,
          audience,
          sort,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        }),
      ])

      if (cancelled) return

      if (!overviewResult.success || !listResult.success) {
        setOverview(overviewResult.overview)
        setRows([])
        setTotal(0)
        setError(overviewResult.message || listResult.message || 'IP 통계를 불러오지 못했습니다.')
      } else {
        setOverview(overviewResult.overview)
        setRows(listResult.rows)
        setTotal(listResult.total)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [audience, page, range.from, range.to, search, sort])

  useEffect(() => {
    if (!selectedIp) return undefined
    let cancelled = false

    async function loadDetail() {
      setDetailLoading(true)
      setDetailError('')
      const result = await fetchIpVisitDetail({
        ip: selectedIp,
        from: range.from,
        to: range.to,
        limit: EVENT_PAGE_SIZE,
        offset: (detailPage - 1) * EVENT_PAGE_SIZE,
      })
      if (cancelled) return
      if (!result.success) {
        setDetail(null)
        setDetailError(result.message)
      } else {
        setDetail(result.detail)
      }
      setDetailLoading(false)
    }

    loadDetail()
    return () => {
      cancelled = true
    }
  }, [detailPage, range.from, range.to, selectedIp])

  const changeRetention = async (days) => {
    setRetentionMessage('')
    const result = await updateIpVisitRetention(days)
    setRetentionMessage(result.success ? `${days}일 이후 기록은 삭제되도록 저장했습니다.` : result.message)
    if (result.success && overview) {
      setOverview({ ...overview, retention_days: days })
    }
  }

  return (
    <section className="visitor-stats-page__section ip-visit-panel" aria-labelledby="ip-visit-stats">
      <h2 id="ip-visit-stats" className="visitor-stats-page__section-title">IP 기준 방문 통계</h2>
      <p className="visitor-stats-page__hint">
        이 숫자는 푸터 TODAY/TOTAL과 다릅니다. 푸터는 브라우저마다 한국 날짜 기준 하루 1회를 더하고, 여기의 순 방문 IP 수는 같은 주소가 여러 번 접속해도 한 번만 셉니다. IP 수는 실제 사람 수가 아닙니다.
      </p>
      {loading ? <p>불러오는 중...</p> : null}
      {error ? <p className="ip-visit-panel__error" role="alert">{error}</p> : null}
      <div className="visitor-stats-page__summary visitor-stats-page__summary--wide">
        {[
          ['오늘 순 방문 IP', overview?.today_unique_ips],
          ['오늘 전체 접속 횟수', overview?.today_hits],
          ['누적 순 방문 IP', overview?.total_unique_ips],
          ['누적 전체 접속 횟수', overview?.total_hits],
        ].map(([label, value]) => (
          <div key={label} className="visitor-stats-page__summary-item">
            <span className="visitor-stats-page__summary-label">{label}</span>
            <strong>{value == null ? '—' : formatVisitorCount(value)}</strong>
          </div>
        ))}
      </div>

      <div className="ip-visit-panel__filters">
        <div className="visitor-stats-page__period-buttons" role="group" aria-label="IP 조회 기간">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`visitor-stats-page__period-button${period === option.id ? ' visitor-stats-page__period-button--active' : ''}`}
              onClick={() => {
                setPeriod(option.id)
                setPage(1)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        {period === 'custom' ? (
          <div className="visitor-stats-page__custom-range">
            <label className="visitor-stats-page__date-field">
              <span>시작</span>
              <input type="date" value={customFrom} max={customTo || today} onChange={(event) => { setCustomFrom(event.target.value); setPage(1) }} />
            </label>
            <label className="visitor-stats-page__date-field">
              <span>종료</span>
              <input type="date" value={customTo} min={customFrom} max={today} onChange={(event) => { setCustomTo(event.target.value); setPage(1) }} />
            </label>
          </div>
        ) : null}
        <form
          className="ip-visit-panel__search"
          onSubmit={(event) => {
            event.preventDefault()
            setSearch(searchInput.trim())
            setPage(1)
          }}
        >
          <label htmlFor="ip-visit-search">IP 주소 검색</label>
          <input id="ip-visit-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="IP 주소" />
          <button type="submit">검색</button>
        </form>
        <label>
          회원 구분
          <select value={audience} onChange={(event) => { setAudience(event.target.value); setPage(1) }}>
            {AUDIENCE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <label>
          정렬
          <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1) }}>
            {SORT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
      </div>

      <div className="member-management-page__table-wrap">
        <table className="member-management-page__table">
          <thead>
            <tr>
              <th scope="col">IP 주소</th>
              <th scope="col">최초 접속</th>
              <th scope="col">마지막 접속</th>
              <th scope="col">오늘 접속</th>
              <th scope="col">누적 접속</th>
              <th scope="col">기간 내 접속</th>
              <th scope="col">회원 / 비회원</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7}>이 기간에 기록된 IP가 없습니다.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.ip_address}>
                <td>
                  <button
                    type="button"
                    className="ip-visit-panel__ip-button"
                    onClick={() => {
                      setSelectedIp(row.ip_address)
                      setDetail(null)
                      setDetailPage(1)
                    }}
                  >
                    {row.ip_address}
                  </button>
                </td>
                <td>{formatVisitDateTime(row.first_seen)}</td>
                <td>{formatVisitDateTime(row.last_seen)}</td>
                <td>{formatVisitorCount(row.today_hits)}</td>
                <td>{formatVisitorCount(row.total_hits)}</td>
                <td>{formatVisitorCount(row.range_hits)}</td>
                <td>{audienceLabel(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ip-visit-panel__pager">
        <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>이전</button>
        <span>{page} / {pageCount} · {total}개 IP</span>
        <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount}>다음</button>
      </div>

      <div className="ip-visit-panel__retention">
        <p>IP 상세 기록 보관 기간: {overview?.retention_days ?? '—'}일. 기간이 지난 이 IP 기록만 삭제되며, 기존 방문자 수와 회원 기록은 지우지 않습니다.</p>
        <div className="visitor-stats-page__period-buttons">
          {RETENTION_OPTIONS.map((days) => (
            <button key={days} type="button" className="visitor-stats-page__period-button" onClick={() => changeRetention(days)}>
              {days}일
            </button>
          ))}
        </div>
        {retentionMessage ? <p role="status">{retentionMessage}</p> : null}
      </div>

      {selectedIp ? (
        <IpVisitDetail
          detail={detail}
          loading={detailLoading}
          error={detailError}
          page={detailPage}
          onPage={setDetailPage}
          onClose={() => setSelectedIp('')}
        />
      ) : null}
    </section>
  )
}

export default IpVisitPanel
