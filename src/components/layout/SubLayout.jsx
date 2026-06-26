import { Outlet, useLocation } from 'react-router-dom'
import Breadcrumb from '@/components/Breadcrumb'
import { getPageMeta } from '@/data/pageMeta'
import './SubLayout.css'

const LOCATION_PATH = '/about/location'
const WORSHIP_PATH = '/worship'
const CHURCH_NEWS_PATH = '/church-news'
const EVENT_PHOTOS_PATH = '/church-news/event-photos'

const CUSTOM_HEADER_PATHS = new Set([LOCATION_PATH, WORSHIP_PATH, CHURCH_NEWS_PATH, EVENT_PHOTOS_PATH])

function SubLayout() {
  const { pathname } = useLocation()
  const { title, subtitle } = getPageMeta(pathname)
  const hasCustomHeader =
    CUSTOM_HEADER_PATHS.has(pathname) || pathname.startsWith(`${EVENT_PHOTOS_PATH}/`)

  return (
    <div className={`sub-layout${hasCustomHeader ? ' sub-layout--custom-header' : ''}`}>
      {!hasCustomHeader && (
        <div className="sub-layout__header">
          <div className="sub-layout__heading">
            <h1 className="sub-layout__title">{title}</h1>
            {subtitle && <p className="sub-layout__subtitle">{subtitle}</p>}
          </div>
          <Breadcrumb />
        </div>
      )}
      <Outlet />
    </div>
  )
}

export default SubLayout
