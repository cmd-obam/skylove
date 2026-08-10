import { useEffect, useMemo, useState } from 'react'
import MemberMypageLayout from '@/components/auth/MemberMypageLayout'
import { formatVisitorCount, loadVisitorStats } from '@/services/analytics/visitorStats'
import {
  fetchReferralStatsForAdmin,
  fetchSiteVisitsForAdmin,
  formatVisitDateTime,
  formatVisitTime,
  resolveVisitorStatsRange,
} from '@/services/analytics/visitorStatsAdmin'
import { getKoreaDateString } from '@/utils/visitorDate'
import '@/pages/MemberManagement.css'
import './VisitorStatsPage.css'

const PERIOD_OPTIONS = [
  { id: 'today', label: '오늘' },
  { id: 'yesterday', label: '어제' },
  { id: '7d', label: '최근 7일' },
  { id: '30d', label: '최근 30일' },
  { id: 'custom', label: '직접 선택' },
]

const VISIT_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'member', label: '회원' },
  { id: 'guest', label: '비회원' },
]

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

  const range = useMemo(
    () => resolveVisitorStatsRange(period, customFrom, customTo),
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

      const [visitsResult, referralResult] = await Promise.all([
        fetchSiteVisitsForAdmin(range.from, range.to),
        fetchReferralStatsForAdmin(range.from, range.to),
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

  return (
    <MemberMypageLayout>
      <div className="member-management-page visitor-stats-page">
        <header className="member-management-page__header">
          <h1 className="member-management-page__title">방문자통계</h1>
          <p className="member-management-page__subtitle">
            TODAY / TOTAL은 기존 집계를 유지합니다. 아래 방문 기록에서 회원/비회원을 구분합니다.
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
              오늘 / 누적 방문자
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
              TODAY / TOTAL 계산 로직은 변경하지 않았습니다. 상세 회원/비회원 구분은 아래 방문
              기록을 사용합니다.
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
            <p className="visitor-stats-page__hint">현재 조회: {periodLabel}</p>
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
            <section className="visitor-stats-page__section" aria-labelledby="visit-summary">
              <h2 id="visit-summary" className="visitor-stats-page__section-title">
                {isSingleDay ? '오늘 방문자' : '기간 방문자'}
              </h2>
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
            </section>

            <section className="visitor-stats-page__section" aria-labelledby="visit-records">
              <h2 id="visit-records" className="visitor-stats-page__section-title">
                방문 기록
                <span className="visitor-stats-page__section-count">
                  {' '}
                  ({filteredVisits.length}건)
                </span>
              </h2>

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
            </section>

            <section className="visitor-stats-page__section" aria-labelledby="referral-stats">
              <h2 id="referral-stats" className="visitor-stats-page__section-title">
                유입 경로
              </h2>
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
            </section>

            <section className="visitor-stats-page__section" aria-labelledby="recent-visits">
              <h2 id="recent-visits" className="visitor-stats-page__section-title">
                최근 방문 기록
              </h2>
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
            </section>
          </>
        )}
      </div>
    </MemberMypageLayout>
  )
}

export default VisitorStatsPage
