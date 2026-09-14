import { useEffect, useMemo, useState } from 'react'
import MemberMypageLayout from '@/components/auth/MemberMypageLayout'
import { formatVisitorCount, loadVisitorStats } from '@/services/analytics/visitorStats'
import {
  fetchReferralStatsForAdmin,
  fetchSiteVisitsForAdmin,
  formatVisitDateTime,
  formatVisitTime,
} from '@/services/analytics/visitorStatsAdmin'
import {
  fetchSiteAnalyticsDashboard,
  formatDurationMs,
  getHourBucketLabel,
  getReferralAnalyticsLabel,
  getWeekdayLabel,
  resolveAnalyticsRange,
} from '@/services/analytics/siteAnalyticsAdmin'
import { getKoreaDateString } from '@/utils/visitorDate'
import '@/pages/MemberManagement.css'
import './VisitorStatsPage.css'

const PERIOD_OPTIONS = [
  { id: 'today', label: '오늘' },
  { id: 'yesterday', label: '어제' },
  { id: '7d', label: '최근 7일' },
  { id: '30d', label: '최근 30일' },
  { id: '90d', label: '최근 90일' },
  { id: 'custom', label: '직접 선택' },
]

const VISIT_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'member', label: '회원' },
  { id: 'guest', label: '비회원' },
]

function StatCards({ items }) {
  return (
    <div className="visitor-stats-page__summary visitor-stats-page__summary--wide">
      {items.map((item) => (
        <div key={item.label} className="visitor-stats-page__summary-item">
          <span className="visitor-stats-page__summary-label">{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  )
}

function SimpleTable({ columns, rows, emptyText }) {
  if (!rows?.length) {
    return <p className="member-management-page__empty">{emptyText}</p>
  }

  return (
    <div className="member-management-page__table-wrap">
      <table className="member-management-page__table visitor-stats-page__data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || row.key || index}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AccordionPanel({ id, title, count, open, onToggle, children }) {
  const panelId = `visitor-stats-panel-${id}`
  const headingId = `visitor-stats-heading-${id}`

  return (
    <section
      className={`visitor-stats-page__accordion${open ? ' visitor-stats-page__accordion--open' : ''}`}
      aria-labelledby={headingId}
    >
      <h2 className="visitor-stats-page__accordion-heading" id={headingId}>
        <button
          type="button"
          className="visitor-stats-page__accordion-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => onToggle(id)}
        >
          <span className="visitor-stats-page__accordion-chevron" aria-hidden="true">
            {open ? '▾' : '▸'}
          </span>
          <span className="visitor-stats-page__accordion-title">{title}</span>
          {count != null ? (
            <span className="visitor-stats-page__section-count">({count})</span>
          ) : null}
        </button>
      </h2>
      {open ? (
        <div id={panelId} className="visitor-stats-page__accordion-panel">
          {children}
        </div>
      ) : null}
    </section>
  )
}

const DEFAULT_OPEN_ACCORDIONS = new Set(['summary'])

function VisitorStatsPage() {
  const today = getKoreaDateString()
  const [stats, setStats] = useState({ todayCount: null, totalCount: null })
  const [statsError, setStatsError] = useState('')
  const [statsLoading, setStatsLoading] = useState(true)

  const [period, setPeriod] = useState('today')
  const [customFrom, setCustomFrom] = useState(today)
  const [customTo, setCustomTo] = useState(today)
  const [visitFilter, setVisitFilter] = useState('all')
  const [detailLoading, setDetailLoading] = useState(true)
  const [detailError, setDetailError] = useState('')
  const [visits, setVisits] = useState([])
  const [referralStats, setReferralStats] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [analyticsError, setAnalyticsError] = useState('')
  const [openAccordions, setOpenAccordions] = useState(() => new Set(DEFAULT_OPEN_ACCORDIONS))

  const range = useMemo(
    () => resolveAnalyticsRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  )

  const isSingleDay = range.from === range.to

  useEffect(() => {
    let cancelled = false

    async function loadCoreStats() {
      try {
        const result = await loadVisitorStats()
        if (!cancelled) {
          setStats(result)
          setStatsLoading(false)
        }
      } catch (loadError) {
        if (!cancelled) {
          setStatsError(loadError.message || '방문자 통계를 불러오지 못했습니다.')
          setStatsLoading(false)
        }
      }
    }

    loadCoreStats()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadDetails() {
      setDetailLoading(true)
      setDetailError('')
      setAnalyticsError('')

      const [visitsResult, referralResult, analyticsResult] = await Promise.all([
        fetchSiteVisitsForAdmin(range.from, range.to),
        fetchReferralStatsForAdmin(range.from, range.to),
        fetchSiteAnalyticsDashboard(range.from, range.to),
      ])

      if (cancelled) {
        return
      }

      const errors = []
      if (!visitsResult.success) {
        errors.push(visitsResult.message)
        setVisits([])
      } else {
        setVisits(visitsResult.visits)
      }

      if (!referralResult.success) {
        errors.push(referralResult.message)
        setReferralStats([])
      } else {
        setReferralStats(referralResult.stats)
      }

      if (!analyticsResult.success) {
        setAnalyticsError(analyticsResult.message)
        setAnalytics(null)
      } else {
        setAnalytics(analyticsResult.dashboard)
      }

      setDetailError(errors.filter(Boolean).join(' '))
      setDetailLoading(false)
    }

    loadDetails()
    return () => {
      cancelled = true
    }
  }, [range.from, range.to])

  const visitCounts = useMemo(() => {
    const member = visits.filter((visit) => visit.isMember).length
    const guest = visits.length - member
    return { total: visits.length, member, guest }
  }, [visits])

  const filteredVisits = useMemo(() => {
    if (visitFilter === 'member') {
      return visits.filter((visit) => visit.isMember)
    }
    if (visitFilter === 'guest') {
      return visits.filter((visit) => !visit.isMember)
    }
    return visits
  }, [visits, visitFilter])

  const recentVisits = useMemo(
    () =>
      [...visits].sort((a, b) => {
        const aTime = a.lastVisitAt ? new Date(a.lastVisitAt).getTime() : 0
        const bTime = b.lastVisitAt ? new Date(b.lastVisitAt).getTime() : 0
        return bTime - aTime
      }),
    [visits],
  )

  const periodLabel =
    period === 'custom'
      ? `${range.from} ~ ${range.to}`
      : PERIOD_OPTIONS.find((item) => item.id === period)?.label || '오늘'

  const referralTotals = useMemo(() => {
    return referralStats.reduce(
      (acc, row) => {
        acc.total += row.totalCount
        acc.member += row.memberCount
        acc.guest += row.guestCount
        return acc
      },
      { total: 0, member: 0, guest: 0 },
    )
  }, [referralStats])

  const summary = analytics?.summary
  const cumulative = analytics?.cumulative
  const returningRate =
    summary && summary.sessions > 0
      ? Math.round((summary.returning_visitors / summary.sessions) * 1000) / 10
      : 0

  const analyticsAccordionIds = useMemo(
    () =>
      analyticsError
        ? ['summary', 'visit-summary', 'visit-records', 'referral-legacy', 'recent-visits']
        : [
            'summary',
            'daily',
            'referrers',
            'pages',
            'worship',
            'duration',
            'returning',
            'hourly',
            'weekday',
            'devices',
            'viewports',
            'landings',
            'scroll',
            'cta',
            'external',
            'visit-summary',
            'visit-records',
            'referral-legacy',
            'recent-visits',
          ],
    [analyticsError],
  )

  const toggleAccordion = (id) => {
    setOpenAccordions((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAllAccordions = () => {
    setOpenAccordions(new Set(analyticsAccordionIds))
  }

  const collapseAllAccordions = () => {
    setOpenAccordions(new Set())
  }

  const isAccordionOpen = (id) => openAccordions.has(id)

  return (
    <MemberMypageLayout>
      <div className="member-management-page visitor-stats-page">
        <header className="member-management-page__header">
          <h1 className="member-management-page__title">방문자통계</h1>
          <p className="member-management-page__subtitle">
            푸터 TODAY / TOTAL은 기존 집계를 유지합니다. 아래 상세 분석은 별도 시스템입니다.
          </p>
        </header>

        {statsLoading ? (
          <p className="member-management-page__empty">불러오는 중...</p>
        ) : statsError ? (
          <p className="member-management-page__feedback member-management-page__feedback--error">
            {statsError}
          </p>
        ) : (
          <section className="visitor-stats-page__section" aria-labelledby="visitor-core-stats">
            <h2 id="visitor-core-stats" className="visitor-stats-page__section-title">
              푸터 집계 (TODAY / TOTAL)
            </h2>
            <div className="member-management-page__table-wrap">
              <table className="member-management-page__table visitor-stats-page__core-table">
                <thead>
                  <tr>
                    <th scope="col">구분</th>
                    <th scope="col">방문자 수</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>TODAY</td>
                    <td>
                      {stats.todayCount == null ? '—' : formatVisitorCount(stats.todayCount)}
                    </td>
                  </tr>
                  <tr>
                    <td>TOTAL</td>
                    <td>
                      {stats.totalCount == null ? '—' : formatVisitorCount(stats.totalCount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="visitor-stats-page__hint">
              이 숫자는 홈페이지 푸터와 동일한 기존 집계입니다. 변경하지 않습니다.
            </p>
          </section>
        )}

        <section className="visitor-stats-page__section" aria-labelledby="visitor-period-filter">
          <h2 id="visitor-period-filter" className="visitor-stats-page__section-title">
            조회 기간
          </h2>
          <div className="visitor-stats-page__period">
            <div className="visitor-stats-page__period-buttons" role="group" aria-label="기간 선택">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`visitor-stats-page__period-button${
                    period === option.id ? ' visitor-stats-page__period-button--active' : ''
                  }`}
                  onClick={() => setPeriod(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {period === 'custom' ? (
              <div className="visitor-stats-page__custom-range">
                <label className="visitor-stats-page__date-field">
                  <span>시작</span>
                  <input
                    type="date"
                    value={customFrom}
                    max={customTo || today}
                    onChange={(event) => setCustomFrom(event.target.value)}
                  />
                </label>
                <label className="visitor-stats-page__date-field">
                  <span>종료</span>
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom}
                    max={today}
                    onChange={(event) => setCustomTo(event.target.value)}
                  />
                </label>
              </div>
            ) : null}
            <p className="visitor-stats-page__hint">현재 조회: {periodLabel} (Asia/Seoul)</p>
          </div>
        </section>

        {detailError ? (
          <p className="member-management-page__feedback member-management-page__feedback--error">
            {detailError}
          </p>
        ) : null}

        {detailLoading ? (
          <p className="member-management-page__empty">상세 통계를 불러오는 중...</p>
        ) : (
          <>
            <div className="visitor-stats-page__accordion-toolbar">
              <button
                type="button"
                className="visitor-stats-page__accordion-action"
                onClick={expandAllAccordions}
              >
                전체 펼치기
              </button>
              <button
                type="button"
                className="visitor-stats-page__accordion-action"
                onClick={collapseAllAccordions}
              >
                전체 접기
              </button>
            </div>

            <AccordionPanel
              id="summary"
              title="상세 분석 요약"
              open={isAccordionOpen('summary')}
              onToggle={toggleAccordion}
            >
              {analyticsError ? (
                <p className="member-management-page__feedback member-management-page__feedback--error">
                  {analyticsError}
                  <span className="visitor-stats-page__hint">
                    {' '}
                    (Supabase에 050_site_analytics 마이그레이션 적용이 필요할 수 있습니다.)
                  </span>
                </p>
              ) : (
                <>
                  <StatCards
                    items={[
                      { label: '고유 방문자', value: summary?.visitors ?? 0 },
                      { label: '세션', value: summary?.sessions ?? 0 },
                      { label: '페이지뷰', value: summary?.pageviews ?? 0 },
                      {
                        label: '평균 체류시간',
                        value: formatDurationMs(summary?.avg_session_ms),
                      },
                      {
                        label: '중앙값 체류시간',
                        value: formatDurationMs(summary?.median_session_ms),
                      },
                      {
                        label: '재방문율',
                        value: `${returningRate}%`,
                      },
                    ]}
                  />
                  <div className="visitor-stats-page__summary visitor-stats-page__summary--wide visitor-stats-page__summary--spaced">
                    <div className="visitor-stats-page__summary-item">
                      <span className="visitor-stats-page__summary-label">누적 고유 방문자</span>
                      <strong>{cumulative?.visitors ?? 0}</strong>
                    </div>
                    <div className="visitor-stats-page__summary-item">
                      <span className="visitor-stats-page__summary-label">누적 세션</span>
                      <strong>{cumulative?.sessions ?? 0}</strong>
                    </div>
                    <div className="visitor-stats-page__summary-item">
                      <span className="visitor-stats-page__summary-label">누적 페이지뷰</span>
                      <strong>{cumulative?.pageviews ?? 0}</strong>
                    </div>
                    <div className="visitor-stats-page__summary-item">
                      <span className="visitor-stats-page__summary-label">신규 세션</span>
                      <strong>{summary?.new_visitors ?? 0}</strong>
                    </div>
                    <div className="visitor-stats-page__summary-item">
                      <span className="visitor-stats-page__summary-label">재방문 세션</span>
                      <strong>{summary?.returning_visitors ?? 0}</strong>
                    </div>
                  </div>
                </>
              )}
            </AccordionPanel>

            {!analyticsError && analytics ? (
              <>
                <AccordionPanel
                  id="daily"
                  title="일일 방문 통계"
                  open={isAccordionOpen('daily')}
                  onToggle={toggleAccordion}
                >
                  <SimpleTable
                    emptyText="일일 통계가 없습니다."
                    columns={[
                      { key: 'day', label: '날짜' },
                      { key: 'visitors', label: '고유 방문자' },
                      { key: 'sessions', label: '세션' },
                      { key: 'pageviews', label: '페이지뷰' },
                    ]}
                    rows={analytics.daily}
                  />
                </AccordionPanel>

                <AccordionPanel
                  id="referrers"
                  title="유입경로 (상세)"
                  open={isAccordionOpen('referrers')}
                  onToggle={toggleAccordion}
                >
                  <SimpleTable
                    emptyText="유입경로 데이터가 없습니다."
                    columns={[
                      {
                        key: 'source',
                        label: '유입경로',
                        render: (row) => getReferralAnalyticsLabel(row.source),
                      },
                      { key: 'visitors', label: '방문자' },
                      { key: 'sessions', label: '세션' },
                      {
                        key: 'avg_ms',
                        label: '평균 체류',
                        render: (row) => formatDurationMs(row.avg_ms),
                      },
                    ]}
                    rows={analytics.referrers}
                  />
                </AccordionPanel>

                <AccordionPanel
                  id="pages"
                  title="인기 페이지"
                  open={isAccordionOpen('pages')}
                  onToggle={toggleAccordion}
                >
                  <SimpleTable
                    emptyText="페이지 데이터가 없습니다."
                    columns={[
                      { key: 'path', label: '경로' },
                      { key: 'pageviews', label: '조회수' },
                      { key: 'visitors', label: '고유 방문자' },
                      { key: 'sessions', label: '세션' },
                      {
                        key: 'avg_ms',
                        label: '평균 체류',
                        render: (row) => formatDurationMs(row.avg_ms),
                      },
                    ]}
                    rows={analytics.pages}
                  />
                </AccordionPanel>

                <AccordionPanel
                  id="worship"
                  title="인기 예배말씀 콘텐츠"
                  open={isAccordionOpen('worship')}
                  onToggle={toggleAccordion}
                >
                  <SimpleTable
                    emptyText="예배말씀 분석 데이터가 없습니다."
                    columns={[
                      { key: 'title', label: '제목', render: (row) => row.title || row.post_id },
                      { key: 'post_type', label: '게시판' },
                      { key: 'pageviews', label: '조회수' },
                      { key: 'visitors', label: '고유 방문자' },
                      {
                        key: 'avg_ms',
                        label: '평균 체류',
                        render: (row) => formatDurationMs(row.avg_ms),
                      },
                    ]}
                    rows={analytics.worship}
                  />
                </AccordionPanel>

                <AccordionPanel
                  id="duration"
                  title="체류시간 구간"
                  open={isAccordionOpen('duration')}
                  onToggle={toggleAccordion}
                >
                  <SimpleTable
                    emptyText="체류시간 데이터가 없습니다."
                    columns={[
                      { key: 'bucket', label: '구간' },
                      { key: 'sessions', label: '세션' },
                    ]}
                    rows={analytics.duration_buckets}
                  />
                </AccordionPanel>

                <AccordionPanel
                  id="returning"
                  title="신규 / 재방문"
                  open={isAccordionOpen('returning')}
                  onToggle={toggleAccordion}
                >
                  <StatCards
                    items={[
                      { label: '신규 세션', value: summary?.new_visitors ?? 0 },
                      { label: '재방문 세션', value: summary?.returning_visitors ?? 0 },
                      { label: '재방문율', value: `${returningRate}%` },
                    ]}
                  />
                  <SimpleTable
                    emptyText="방문 빈도 데이터가 없습니다."
                    columns={[
                      { key: 'bucket', label: '방문 빈도' },
                      { key: 'visitors', label: '방문자' },
                    ]}
                    rows={analytics.visit_freq}
                  />
                </AccordionPanel>

                <AccordionPanel
                  id="hourly"
                  title="시간대별 방문"
                  open={isAccordionOpen('hourly')}
                  onToggle={toggleAccordion}
                >
                  <SimpleTable
                    emptyText="시간대 데이터가 없습니다."
                    columns={[
                      {
                        key: 'hour_start',
                        label: '시간대',
                        render: (row) => getHourBucketLabel(row.hour_start),
                      },
                      { key: 'visitors', label: '방문자' },
                      { key: 'sessions', label: '세션' },
                    ]}
                    rows={analytics.hourly}
                  />
                </AccordionPanel>

                <AccordionPanel
                  id="weekday"
                  title="요일별 방문"
                  open={isAccordionOpen('weekday')}
                  onToggle={toggleAccordion}
                >
                  <SimpleTable
                    emptyText="요일 데이터가 없습니다."
                    columns={[
                      {
                        key: 'dow',
                        label: '요일',
                        render: (row) => getWeekdayLabel(row.dow),
                      },
                      { key: 'visitors', label: '방문자' },
                      { key: 'sessions', label: '세션' },
                    ]}
                    rows={analytics.weekday}
                  />
                </AccordionPanel>

                <AccordionPanel
                  id="devices"
                  title="기기 / 브라우저 / OS"
                  open={isAccordionOpen('devices')}
                  onToggle={toggleAccordion}
                >
                  <div className="visitor-stats-page__split">
                    <SimpleTable
                      emptyText="기기 데이터가 없습니다."
                      columns={[
                        { key: 'name', label: '기기' },
                        { key: 'sessions', label: '세션' },
                      ]}
                      rows={analytics.devices}
                    />
                    <SimpleTable
                      emptyText="브라우저 데이터가 없습니다."
                      columns={[
                        { key: 'name', label: '브라우저' },
                        { key: 'sessions', label: '세션' },
                      ]}
                      rows={analytics.browsers}
                    />
                    <SimpleTable
                      emptyText="OS 데이터가 없습니다."
                      columns={[
                        { key: 'name', label: 'OS' },
                        { key: 'sessions', label: '세션' },
                      ]}
                      rows={analytics.os}
                    />
                  </div>
                </AccordionPanel>

                <AccordionPanel
                  id="viewports"
                  title="화면 크기"
                  open={isAccordionOpen('viewports')}
                  onToggle={toggleAccordion}
                >
                  <SimpleTable
                    emptyText="화면 크기 데이터가 없습니다."
                    columns={[
                      { key: 'bucket', label: '가로 해상도' },
                      { key: 'sessions', label: '세션' },
                    ]}
                    rows={analytics.viewports}
                  />
                </AccordionPanel>

                <AccordionPanel
                  id="landings"
                  title="첫 방문 / 종료 페이지"
                  open={isAccordionOpen('landings')}
                  onToggle={toggleAccordion}
                >
                  <div className="visitor-stats-page__split">
                    <div>
                      <h3 className="visitor-stats-page__subheading">진입 페이지</h3>
                      <SimpleTable
                        emptyText="진입 페이지 데이터가 없습니다."
                        columns={[
                          { key: 'path', label: '경로' },
                          { key: 'sessions', label: '세션' },
                        ]}
                        rows={analytics.landings}
                      />
                    </div>
                    <div>
                      <h3 className="visitor-stats-page__subheading">종료 페이지</h3>
                      <SimpleTable
                        emptyText="종료 페이지 데이터가 없습니다."
                        columns={[
                          { key: 'path', label: '경로' },
                          { key: 'sessions', label: '세션' },
                        ]}
                        rows={analytics.exits}
                      />
                    </div>
                  </div>
                </AccordionPanel>

                <AccordionPanel
                  id="scroll"
                  title="스크롤 깊이"
                  open={isAccordionOpen('scroll')}
                  onToggle={toggleAccordion}
                >
                  <StatCards
                    items={[
                      { label: '25%+', value: analytics.scroll?.d25 ?? 0 },
                      { label: '50%+', value: analytics.scroll?.d50 ?? 0 },
                      { label: '75%+', value: analytics.scroll?.d75 ?? 0 },
                      { label: '90%+', value: analytics.scroll?.d90 ?? 0 },
                      { label: '100%', value: analytics.scroll?.d100 ?? 0 },
                      { label: '페이지뷰', value: analytics.scroll?.total ?? 0 },
                    ]}
                  />
                </AccordionPanel>

                <AccordionPanel
                  id="cta"
                  title="CTA / 클릭"
                  open={isAccordionOpen('cta')}
                  onToggle={toggleAccordion}
                >
                  <SimpleTable
                    emptyText="클릭 데이터가 없습니다."
                    columns={[
                      { key: 'label', label: '항목' },
                      { key: 'clicks', label: '클릭' },
                    ]}
                    rows={analytics.cta}
                  />
                </AccordionPanel>

                <AccordionPanel
                  id="external"
                  title="외부 링크 클릭"
                  open={isAccordionOpen('external')}
                  onToggle={toggleAccordion}
                >
                  <SimpleTable
                    emptyText="외부 링크 클릭 데이터가 없습니다."
                    columns={[
                      { key: 'href', label: '링크' },
                      { key: 'clicks', label: '클릭' },
                    ]}
                    rows={analytics.external_links}
                  />
                </AccordionPanel>
              </>
            ) : null}

            <AccordionPanel
              id="visit-summary"
              title={isSingleDay ? '기존 방문 기록 요약' : '기간 방문 기록 요약'}
              open={isAccordionOpen('visit-summary')}
              onToggle={toggleAccordion}
            >
              <div className="visitor-stats-page__summary">
                <div className="visitor-stats-page__summary-item">
                  <span className="visitor-stats-page__summary-label">전체</span>
                  <strong>{visitCounts.total}명</strong>
                </div>
                <div className="visitor-stats-page__summary-item">
                  <span className="visitor-stats-page__summary-label">회원</span>
                  <strong>{visitCounts.member}명</strong>
                </div>
                <div className="visitor-stats-page__summary-item">
                  <span className="visitor-stats-page__summary-label">비회원</span>
                  <strong>{visitCounts.guest}명</strong>
                </div>
              </div>
              <p className="visitor-stats-page__hint">
                기존 site_traffic_events 기반 회원/비회원 방문 기록입니다.
              </p>
            </AccordionPanel>

            <AccordionPanel
              id="visit-records"
              title="방문 기록"
              count={filteredVisits.length}
              open={isAccordionOpen('visit-records')}
              onToggle={toggleAccordion}
            >
              <div className="visitor-stats-page__period-buttons" role="group" aria-label="방문 구분 필터">
                {VISIT_FILTERS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`visitor-stats-page__period-button${
                      visitFilter === option.id ? ' visitor-stats-page__period-button--active' : ''
                    }`}
                    onClick={() => setVisitFilter(option.id)}
                  >
                    {option.label}
                    {option.id === 'all'
                      ? ` ${visitCounts.total}`
                      : option.id === 'member'
                        ? ` ${visitCounts.member}`
                        : ` ${visitCounts.guest}`}
                  </button>
                ))}
              </div>

              {filteredVisits.length === 0 ? (
                <p className="member-management-page__empty">해당 조건의 방문 기록이 없습니다.</p>
              ) : (
                <>
                  <div className="member-management-page__table-wrap visitor-stats-page__desktop-only">
                    <table className="member-management-page__table visitor-stats-page__member-table">
                      <thead>
                        <tr>
                          <th scope="col">방문자</th>
                          <th scope="col">구분</th>
                          <th scope="col">아이디</th>
                          <th scope="col">로그인 방식</th>
                          <th scope="col">최초 접속</th>
                          <th scope="col">마지막 접속</th>
                          <th scope="col">유입 경로</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredVisits.map((visit) => (
                          <tr key={visit.id || `${visit.visitorKey}-${visit.visitDate}`}>
                            <td>{visit.name}</td>
                            <td>
                              <span
                                className={`visitor-stats-page__badge${
                                  visit.isMember
                                    ? ' visitor-stats-page__badge--member'
                                    : ' visitor-stats-page__badge--guest'
                                }`}
                              >
                                {visit.visitorTypeLabel}
                              </span>
                            </td>
                            <td>{visit.username}</td>
                            <td>{visit.loginProviderLabel}</td>
                            <td>
                              {isSingleDay
                                ? formatVisitTime(visit.firstVisitAt)
                                : formatVisitDateTime(visit.firstVisitAt)}
                            </td>
                            <td>
                              {isSingleDay
                                ? formatVisitTime(visit.lastVisitAt)
                                : formatVisitDateTime(visit.lastVisitAt)}
                            </td>
                            <td>
                              <span>{visit.referralSourceLabel}</span>
                              {visit.utmCampaign ? (
                                <span className="visitor-stats-page__campaign">
                                  {' '}
                                  · 캠페인 {visit.utmCampaign}
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <ul className="visitor-stats-page__card-list visitor-stats-page__mobile-only">
                    {filteredVisits.map((visit) => (
                      <li
                        key={`card-${visit.id || `${visit.visitorKey}-${visit.visitDate}`}`}
                        className="visitor-stats-page__card"
                      >
                        <p className="visitor-stats-page__card-title">
                          {visit.isMember ? (
                            <>
                              {visit.name} <span>({visit.username})</span>
                            </>
                          ) : (
                            '비회원'
                          )}
                        </p>
                        <p>
                          {visit.visitorTypeLabel} · {visit.loginProviderLabel}
                        </p>
                        <p>
                          최초{' '}
                          {isSingleDay
                            ? formatVisitTime(visit.firstVisitAt)
                            : formatVisitDateTime(visit.firstVisitAt)}
                          {' · '}
                          마지막{' '}
                          {isSingleDay
                            ? formatVisitTime(visit.lastVisitAt)
                            : formatVisitDateTime(visit.lastVisitAt)}
                        </p>
                        <p>
                          유입 {visit.referralSourceLabel}
                          {visit.utmCampaign ? ` · 캠페인 ${visit.utmCampaign}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </AccordionPanel>

            <AccordionPanel
              id="referral-legacy"
              title="유입 경로 (기존)"
              open={isAccordionOpen('referral-legacy')}
              onToggle={toggleAccordion}
            >
              {referralStats.length === 0 ? (
                <p className="member-management-page__empty">해당 기간의 유입 경로 기록이 없습니다.</p>
              ) : (
                <div className="member-management-page__table-wrap">
                  <table className="member-management-page__table visitor-stats-page__referral-table">
                    <thead>
                      <tr>
                        <th scope="col">유입 경로</th>
                        <th scope="col">합계</th>
                        <th scope="col">회원</th>
                        <th scope="col">비회원</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referralStats.map((row) => (
                        <tr key={row.source}>
                          <td>{row.label}</td>
                          <td>{row.totalCount}</td>
                          <td>{row.memberCount}</td>
                          <td>{row.guestCount}</td>
                        </tr>
                      ))}
                      <tr className="visitor-stats-page__referral-total">
                        <td>합계</td>
                        <td>{referralTotals.total}</td>
                        <td>{referralTotals.member}</td>
                        <td>{referralTotals.guest}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </AccordionPanel>

            <AccordionPanel
              id="recent-visits"
              title="최근 방문 기록"
              open={isAccordionOpen('recent-visits')}
              onToggle={toggleAccordion}
            >
              {recentVisits.length === 0 ? (
                <p className="member-management-page__empty">최근 방문 기록이 없습니다.</p>
              ) : (
                <ul className="visitor-stats-page__recent-list">
                  {recentVisits.slice(0, 50).map((visit) => (
                    <li key={`recent-${visit.id || `${visit.visitorKey}-${visit.lastVisitAt}`}`}>
                      <span className="visitor-stats-page__recent-time">
                        {isSingleDay
                          ? formatVisitTime(visit.lastVisitAt)
                          : formatVisitDateTime(visit.lastVisitAt)}
                      </span>
                      <span className="visitor-stats-page__recent-name">
                        {visit.isMember ? visit.name : '비회원'}
                      </span>
                      <span>{visit.visitorTypeLabel}</span>
                      <span>{visit.referralSourceLabel}</span>
                    </li>
                  ))}
                </ul>
              )}
            </AccordionPanel>
          </>
        )}
      </div>
    </MemberMypageLayout>
  )
}

export default VisitorStatsPage
