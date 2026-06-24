import { Outlet, useLocation } from 'react-router-dom'
import Breadcrumb from '@/components/Breadcrumb'
import { getPageMeta } from '@/data/pageMeta'
import './SubLayout.css'

function SubLayout() {
  const { pathname } = useLocation()
  const { title, subtitle } = getPageMeta(pathname)

  return (
    <div className="sub-layout">
      <div className="sub-layout__header">
        <div className="sub-layout__heading">
          <h1 className="sub-layout__title">{title}</h1>
          {subtitle && <p className="sub-layout__subtitle">{subtitle}</p>}
        </div>
        <Breadcrumb />
      </div>
      <Outlet />
    </div>
  )
}

export default SubLayout
