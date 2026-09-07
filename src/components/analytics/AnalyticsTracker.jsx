import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  startSiteAnalytics,
  trackAnalyticsRouteChange,
} from '@/services/analytics/siteAnalytics'

/**
 * Detailed admin analytics tracker.
 * Independent from footer TODAY/TOTAL and site_traffic_events VisitTracker.
 */
function AnalyticsTracker() {
  const location = useLocation()

  useEffect(() => {
    startSiteAnalytics()
  }, [])

  useEffect(() => {
    trackAnalyticsRouteChange()
  }, [location.pathname, location.search])

  return null
}

export default AnalyticsTracker
