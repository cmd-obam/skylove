import { Outlet, useLocation } from 'react-router-dom'
import Breadcrumb from '@/components/Breadcrumb'
import { getPageMeta } from '@/data/pageMeta'
import './SubLayout.css'

const LOCATION_PATH = '/about/location'
const ABOUT_PATH = '/about'
const WORSHIP_PATH = '/worship'
const CHURCH_NEWS_PATH = '/church-news'
const CHURCH_ALBUM_PATH = '/church-news/album'
const NEW_FAMILY_PATH = '/new-family'
const FACILITIES_PATH = '/about/facilities'
const NEWS_WRITE_PATH = '/news/write'
const ALBUM_WRITE_PATH = '/album/write'
const SUNDAY_BLESSING_PATH = '/worship-guide/sunday-blessing'
const SUNDAY_PRAISE_PATH = '/worship-guide/sunday-praise'

const STYLED_WORSHIP_TITLES = {
  [SUNDAY_BLESSING_PATH]: { before: '주일 ', accent: '축복', after: ' 예배' },
  [SUNDAY_PRAISE_PATH]: { before: '주일 ', accent: '찬양', after: ' 예배' },
}

const BREADCRUMB_ONLY_PATHS = new Set([ABOUT_PATH])

const CUSTOM_HEADER_PATHS = new Set([
  LOCATION_PATH,
  WORSHIP_PATH,
  CHURCH_NEWS_PATH,
  CHURCH_ALBUM_PATH,
  NEW_FAMILY_PATH,
  FACILITIES_PATH,
  NEWS_WRITE_PATH,
  ALBUM_WRITE_PATH,
])

function isChurchNewsPostDetail(pathname) {
  if (!pathname.startsWith(`${CHURCH_NEWS_PATH}/`)) {
    return false
  }

  if (pathname === CHURCH_ALBUM_PATH || pathname.startsWith(`${CHURCH_ALBUM_PATH}/`)) {
    return false
  }

  return pathname !== CHURCH_NEWS_PATH
}

function PageTitle({ pathname, title }) {
  const styledTitle = STYLED_WORSHIP_TITLES[pathname]

  if (styledTitle) {
    return (
      <h1 className="sub-layout__title sub-layout__title--worship">
        {styledTitle.before}
        <span className="sub-layout__title-accent">{styledTitle.accent}</span>
        {styledTitle.after}
      </h1>
    )
  }

  return <h1 className="sub-layout__title">{title}</h1>
}

function isWorshipGuidePath(pathname) {
  return pathname.startsWith('/worship-guide/') && pathname !== '/worship-guide'
}

function SubLayout() {
  const { pathname } = useLocation()
  const { title, subtitle } = getPageMeta(pathname)
  const hasCustomHeader =
    CUSTOM_HEADER_PATHS.has(pathname) ||
    pathname.startsWith('/news/') ||
    pathname.startsWith('/album/') ||
    pathname.startsWith(`${CHURCH_ALBUM_PATH}/`) ||
    isChurchNewsPostDetail(pathname) ||
    isWorshipGuidePath(pathname)

  const isBreadcrumbOnly = BREADCRUMB_ONLY_PATHS.has(pathname)

  return (
    <div className={`sub-layout${hasCustomHeader ? ' sub-layout--custom-header' : ''}`}>
      {!hasCustomHeader && isBreadcrumbOnly && (
        <div className="sub-layout__header sub-layout__header--about">
          <div className="sub-layout__heading sub-layout__heading--spacer" aria-hidden="true" />
          <Breadcrumb />
        </div>
      )}
      {!hasCustomHeader && !isBreadcrumbOnly && (
        <div className="sub-layout__header">
          <div className="sub-layout__heading">
            <PageTitle pathname={pathname} title={title} />
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
