import { Outlet } from 'react-router-dom'
import CategorySidebar from '@/components/layout/CategorySidebar'
import './CategoryLayout.css'

function CategoryLayout() {
  return (
    <div className="category-layout">
      <div className="category-layout__inner">
        <CategorySidebar />
        <div className="category-layout__main">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default CategoryLayout
