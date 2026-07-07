import { useEffect, useId, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { findMenuSection, menuItemContainsPath } from '@/data/menu'
import './CategorySidebar.css'

function CategorySidebarItem({ item, sectionPath, pathname }) {
  const sublistId = useId()
  const isGroupActive = menuItemContainsPath(item, pathname)
  const [isExpanded, setIsExpanded] = useState(isGroupActive)

  useEffect(() => {
    if (isGroupActive) {
      setIsExpanded(true)
    }
  }, [isGroupActive])

  if (item.children?.length) {
    return (
      <li className="category-sidebar__item category-sidebar__item--expandable">
        <button
          type="button"
          className={`category-sidebar__link category-sidebar__trigger${
            isExpanded ? ' category-sidebar__link--expanded' : ''
          }`}
          aria-expanded={isExpanded}
          aria-controls={sublistId}
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <span className="category-sidebar__link-text">{item.title}</span>
          <span className="category-sidebar__link-icon" aria-hidden="true">
            +
          </span>
        </button>
        <ul
          id={sublistId}
          className={`category-sidebar__sublist${
            isExpanded ? ' category-sidebar__sublist--open' : ''
          }`}
        >
          {item.children.map((child) => (
            <li key={child.path} className="category-sidebar__subitem">
              <NavLink
                to={child.path}
                end
                className={({ isActive }) =>
                  `category-sidebar__sublink${isActive ? ' category-sidebar__sublink--active' : ''}`
                }
              >
                {child.title}
              </NavLink>
            </li>
          ))}
        </ul>
      </li>
    )
  }

  return (
    <li className="category-sidebar__item">
      <NavLink
        to={item.path}
        className={({ isActive }) =>
          `category-sidebar__link${isActive ? ' category-sidebar__link--active' : ''}`
        }
        end={item.path === sectionPath}
      >
        <span className="category-sidebar__link-text">{item.title}</span>
        <span className="category-sidebar__link-icon" aria-hidden="true">
          +
        </span>
      </NavLink>
    </li>
  )
}

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
            <CategorySidebarItem
              key={item.path}
              item={item}
              sectionPath={section.path}
              pathname={pathname}
            />
          ))}
        </ul>
      </nav>
    </aside>
  )
}

export default CategorySidebar
