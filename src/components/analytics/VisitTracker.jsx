import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { trackSiteVisitExtensions } from '@/services/analytics/visitTracking'

/**
 * Footer 유무와 무관하게 모든 라우트에서
 * 회원/비회원 방문 기록을 남깁니다. (기존 TODAY/TOTAL 로직은 건드리지 않음)
 */
function VisitTracker() {
  const { loading: authLoading, user } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (authLoading) {
      return undefined
    }

    void trackSiteVisitExtensions({ user })
    return undefined
  }, [authLoading, user, user?.id, location.pathname])

  // 탭 복귀 시 마지막 접속 시간 갱신 (하루 1행 upsert, 회원/비회원 공통)
  useEffect(() => {
    if (authLoading) {
      return undefined
    }

    function onVisible() {
      if (document.visibilityState === 'visible') {
        void trackSiteVisitExtensions({ user })
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [authLoading, user, user?.id])

  return null
}

export default VisitTracker
