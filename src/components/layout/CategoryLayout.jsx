import { Outlet, useLocation } from 'react-router-dom'
import CategorySidebar from '@/components/layout/CategorySidebar'
import './CategoryLayout.css'

const CANVAS_MAIN_PATHS = new Set([])
const ABOUT_MAIN_PATHS = new Set(['/about'])

function CategoryLayout() {
  const { pathname } = useLocation()
  const isCanvasMain = CANVAS_MAIN_PATHS.has(pathname)
  const isAboutMain = ABOUT_MAIN_PATHS.has(pathname)

  return (
    <div className={`category-layout${isCanvasMain ? ' category-layout--canvas' : ''}`}>
      <div className="category-layout__inner">
        <CategorySidebar />
        <div
          className={`category-layout__main${
            isCanvasMain ? ' category-layout__main--canvas' : ''
          }${isAboutMain ? ' category-layout__main--about' : ''}`}
        >
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default CategoryLayout
