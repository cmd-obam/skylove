import { useEffect, useState } from 'react'
import MemberMypageLayout from '@/components/auth/MemberMypageLayout'
import { formatVisitorCount, loadVisitorStats } from '@/services/analytics/visitorStats'
import '@/pages/MemberManagement.css'

function VisitorStatsPage() {
  const [stats, setStats] = useState({ todayCount: null, totalCount: null })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const result = await loadVisitorStats()
        if (!cancelled) {
          setStats(result)
          setLoading(false)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || '방문자 통계를 불러오지 못했습니다.')
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <MemberMypageLayout>
      <div className="member-management-page">
        <header className="member-management-page__header">
          <h1 className="member-management-page__title">방문자 통계</h1>
          <p className="member-management-page__subtitle">
            사이트 하단과 동일한 TODAY / TOTAL 통계입니다. (추후 상세 차트 확장 예정)
          </p>
        </header>

        {loading ? (
          <p className="member-management-page__empty">불러오는 중...</p>
        ) : error ? (
          <p className="member-management-page__feedback member-management-page__feedback--error">{error}</p>
        ) : (
          <div className="member-management-page__table-wrap">
            <table className="member-management-page__table">
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
        )}
      </div>
    </MemberMypageLayout>
  )
}

export default VisitorStatsPage
