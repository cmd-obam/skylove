import { Link } from 'react-router-dom'
import { useState } from 'react'
import { AUTH_LINKS, MENU_ITEMS } from '@/data/menu'
import DropdownMenu from '@/components/layout/DropdownMenu'
import './Navigation.css'

function getAuthLinkPath(item) {
  if (item.tab) {
    return { pathname: item.path, search: `?tab=${item.tab}` }
  }

  return item.path
}

function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedItem, setExpandedItem] = useState(null)

  const toggleMenu = () => {
    setIsOpen((prev) => !prev)
  }

  const closeMenu = () => {
    setIsOpen(false)
    setExpandedItem(null)
  }

  const toggleAccordion = (title) => {
    setExpandedItem((prev) => (prev === title ? null : title))
  }

  return (
    <nav className="navigation" aria-label="주요 메뉴">
      <div className="navigation__inner">
        <button
          type="button"
          className="navigation__toggle"
          aria-expanded={isOpen}
          aria-controls="main-menu"
          aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
          onClick={toggleMenu}
        >
          <span className="navigation__toggle-bar" />
          <span className="navigation__toggle-bar" />
          <span className="navigation__toggle-bar" />
        </button>

        <div className={`navigation__panel ${isOpen ? 'navigation__panel--open' : ''}`}>
          <ul className="navigation__utility" aria-label="유틸리티 메뉴">
            {AUTH_LINKS.map((item, index) => (
              <li key={item.label} className="navigation__utility-item">
                {index > 0 && (
                  <span className="navigation__utility-separator" aria-hidden="true">
                    |
                  </span>
                )}
                <Link
                  to={getAuthLinkPath(item)}
                  className="navigation__utility-link"
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <ul id="main-menu" className="navigation__menu">
            {MENU_ITEMS.map((item) => (
              <li
                key={item.path}
                className={`navigation__item${
                  item.children ? ' navigation__item--has-dropdown' : ''
                }`}
              >
                {item.children ? (
                  <>
                    <Link
                      to={item.path}
                      className="navigation__link navigation__link--desktop"
                      onClick={closeMenu}
                    >
                      {item.title}
                    </Link>
                    <button
                      type="button"
                      className="navigation__accordion-trigger"
                      aria-expanded={expandedItem === item.title}
                      onClick={() => toggleAccordion(item.title)}
                    >
                      {item.title}
                    </button>
                    <DropdownMenu items={item.children} onLinkClick={closeMenu} />
                    <ul
                      className={`navigation__submenu${
                        expandedItem === item.title ? ' navigation__submenu--open' : ''
                      }`}
                    >
                      {item.children.map((child) =>
                        child.children?.length ? (
                          <li key={child.path} className="navigation__submenu-group">
                            <span className="navigation__submenu-group-label">{child.title}</span>
                            <ul className="navigation__submenu-nested">
                              {child.children.map((subItem) => (
                                <li key={subItem.path} className="navigation__submenu-item">
                                  <Link
                                    to={subItem.path}
                                    className="navigation__submenu-link"
                                    onClick={closeMenu}
                                  >
                                    <span className="navigation__submenu-prefix" aria-hidden="true">
                                      +
                                    </span>
                                    {subItem.title}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ) : (
                          <li key={child.path} className="navigation__submenu-item">
                            <Link
                              to={child.path}
                              className="navigation__submenu-link"
                              onClick={closeMenu}
                            >
                              <span className="navigation__submenu-prefix" aria-hidden="true">
                                +
                              </span>
                              {child.title}
                            </Link>
                          </li>
                        ),
                      )}
                    </ul>
                  </>
                ) : (
                  <Link to={item.path} className="navigation__link" onClick={closeMenu}>
                    {item.title}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
