import CategorySidebar from '@/components/layout/CategorySidebar'
import SubLayout from '@/components/layout/SubLayout'
import './CategoryLayout.css'

function CategoryLayout() {
  return (
    <div className="category-layout">
      <div className="category-layout__inner">
        <CategorySidebar />
        <div className="category-layout__main">
          <SubLayout />
        </div>
      </div>
    </div>
  )
}

export default CategoryLayout
