import { NavLink, useLocation } from 'react-router-dom'
import { findMenuSection } from '@/data/menu'
import './CategorySidebar.css'

function CategorySidebar() {
  const { pathname } = useLocation()
  const section = findMenuSection(pathname)
  const navItems = section?.children ?? []

  if (!section || navItems.length === 0) {
    return null
  }

  return (
    <aside className="category-sidebar" aria-label={`${section.title} 메뉴`}>
      <div className="category-sidebar__header">
        <h2 className="category-sidebar__title">{section.title}</h2>
        <span className="category-sidebar__accent" aria-hidden="true" />
      </div>

      <nav className="category-sidebar__nav">
        <ul className="category-sidebar__list">
          {navItems.map((item) => (
            <li key={item.path} className="category-sidebar__item">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `category-sidebar__link${isActive ? ' category-sidebar__link--active' : ''}`
                }
                end={item.path === section.path}
              >
                <span className="category-sidebar__link-text">{item.title}</span>
                <span className="category-sidebar__link-icon" aria-hidden="true">
                  +
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

export default CategorySidebar
