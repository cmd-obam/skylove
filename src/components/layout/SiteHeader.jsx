import { Link } from 'react-router-dom'
import { useState } from 'react'
import churchLogo from '@/assets/images/church-logo.png'
import { AUTH_LINKS, MENU_ITEMS } from '@/data/menu'
import DropdownMenu from '@/components/layout/DropdownMenu'
import './SiteHeader.css'

function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedItem, setExpandedItem] = useState(null)

  const closeMenu = () => {
    setIsOpen(false)
    setExpandedItem(null)
  }

  const toggleMenu = () => {
    setIsOpen((prev) => !prev)
  }

  const toggleAccordion = (title) => {
    setExpandedItem((prev) => (prev === title ? null : title))
  }

  return (
    <header className="site-header">
      <div className={`site-header__inner${isOpen ? ' site-header__inner--open' : ''}`}>
        <Link to="/" className="site-header__brand" aria-label="하늘사랑교회 홈으로 이동">
          <img
            src={churchLogo}
            alt=""
            className="site-header__logo"
            aria-hidden="true"
          />
          <span className="site-header__brand-text">
            <span className="site-header__title">하늘사랑교회</span>
            <span className="site-header__subtitle">Heavenly Love Church</span>
          </span>
        </Link>

        <nav className="site-header__nav" aria-label="주요 메뉴">
          <ul id="site-header-menu" className="site-header__menu">
            {MENU_ITEMS.map((item) => (
              <li
                key={item.path}
                className={`site-header__item${
                  item.children ? ' site-header__item--has-dropdown' : ''
                }`}
              >
                {item.children ? (
                  <>
                    <Link
                      to={item.path}
                      className="site-header__link site-header__link--desktop"
                      onClick={closeMenu}
                    >
                      {item.title}
                    </Link>
                    <button
                      type="button"
                      className="site-header__accordion-trigger"
                      aria-expanded={expandedItem === item.title}
                      onClick={() => toggleAccordion(item.title)}
                    >
                      {item.title}
                    </button>
                    <DropdownMenu items={item.children} onLinkClick={closeMenu} />
                    <ul
                      className={`site-header__submenu${
                        expandedItem === item.title ? ' site-header__submenu--open' : ''
                      }`}
                    >
                      {item.children.map((child) => (
                        <li key={child.path} className="site-header__submenu-item">
                          <Link
                            to={child.path}
                            className="site-header__submenu-link"
                            onClick={closeMenu}
                          >
                            {child.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <Link to={item.path} className="site-header__link" onClick={closeMenu}>
                    {item.title}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header__auth" aria-label="계정 메뉴">
          {AUTH_LINKS.map((item, index) => (
            <span key={item.href} className="site-header__auth-item">
              {index > 0 && (
                <span className="site-header__auth-separator" aria-hidden="true">
                  |
                </span>
              )}
              <a href={item.href} className="site-header__auth-link" onClick={closeMenu}>
                {item.label}
              </a>
            </span>
          ))}
        </div>

        <button
          type="button"
          className="site-header__toggle"
          aria-expanded={isOpen}
          aria-controls="site-header-menu"
          aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
          onClick={toggleMenu}
        >
          <span className="site-header__toggle-bar" />
          <span className="site-header__toggle-bar" />
          <span className="site-header__toggle-bar" />
        </button>
      </div>
    </header>
  )
}

export default SiteHeader
