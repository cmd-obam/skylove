import { useEffect, useId, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { findMenuSection, menuItemContainsPath } from '@/data/menu'
import { resolveMenuAliasPath } from '@/utils/boardPaths'
import MenuItemLabel from '@/components/layout/MenuItemLabel'
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
        <div
          className={`category-sidebar__link category-sidebar__group-row${
            isGroupActive ? ' category-sidebar__link--active' : ''
          }`}
        >
          <NavLink
            to={item.path}
            end
            className="category-sidebar__group-link"
          >
            <span className="category-sidebar__link-text">{item.title}</span>
          </NavLink>
          <button
            type="button"
            className="category-sidebar__expand-toggle"
            aria-expanded={isExpanded}
            aria-controls={sublistId}
            aria-label={`${item.title} 하위 메뉴 ${isExpanded ? '접기' : '펼치기'}`}
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            <span className="category-sidebar__link-icon" aria-hidden="true">
              {isExpanded ? '−' : '+'}
            </span>
          </button>
        </div>
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
                <MenuItemLabel item={child} />
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
  const menuPath = resolveMenuAliasPath(pathname)
  const section = findMenuSection(menuPath)
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
              pathname={menuPath}
            />
          ))}
        </ul>
      </nav>
    </aside>
  )
}

export default CategorySidebar
