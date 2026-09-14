import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  startSiteAnalytics,
  syncAnalyticsAuthState,
  trackAnalyticsRouteChange,
} from '@/services/analytics/siteAnalytics'

/**
 * Detailed admin analytics tracker.
 * Independent from footer TODAY/TOTAL and site_traffic_events VisitTracker.
 * Auth 변경 시 세션을 분리해 로그인 구간만 회원 방문으로 기록한다.
 */
function AnalyticsTracker() {
  const location = useLocation()
  const { loading: authLoading, isLoggedIn } = useAuth()

  useEffect(() => {
    startSiteAnalytics()
  }, [])

  useEffect(() => {
    trackAnalyticsRouteChange()
  }, [location.pathname, location.search])

  useEffect(() => {
    if (authLoading) {
      return
    }
    syncAnalyticsAuthState(isLoggedIn)
  }, [authLoading, isLoggedIn])

  return null
}

export default AnalyticsTracker
