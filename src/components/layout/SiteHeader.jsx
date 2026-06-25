import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import churchLogo from '@/assets/images/church-logo.png'
import { AUTH_LINKS, MENU_ITEMS } from '@/data/menu'
import DropdownMenu from '@/components/layout/DropdownMenu'
import './SiteHeader.css'

function getFirstSubMenuPath(item) {
  return item.children?.[0]?.path ?? item.path
}

function SiteHeader() {
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState(null)
  const [expandedItem, setExpandedItem] = useState(null)

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
    setExpandedItem(null)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev)
    if (isMobileMenuOpen) {
      setExpandedItem(null)
    }
  }

  const toggleAccordion = (title) => {
    setExpandedItem((prev) => (prev === title ? null : title))
  }

  const handleCategoryMouseEnter = (title) => {
    setActiveMenu(title)
  }

  const handleCategoryMouseLeave = () => {
    setActiveMenu(null)
  }

  const handleCategoryClick = (item) => {
    const firstPath = getFirstSubMenuPath(item)
    navigate(firstPath)
    setActiveMenu(null)
  }

  useEffect(() => {
    if (!isMobileMenuOpen) {
      document.body.style.overflow = ''
      return undefined
    }

    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        closeMobileMenu()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="site-header-wrap">
      <header className="site-header">
        <div className="site-header__inner">
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

          <nav className="site-header__nav site-header__nav--desktop" aria-label="주요 메뉴">
            <ul className="site-header__menu">
              {MENU_ITEMS.map((item) => (
                <li
                  key={item.title}
                  className={`site-header__item${
                    item.children ? ' site-header__item--has-dropdown' : ''
                  }`}
                  onMouseEnter={
                    item.children ? () => handleCategoryMouseEnter(item.title) : undefined
                  }
                  onMouseLeave={item.children ? handleCategoryMouseLeave : undefined}
                >
                  {item.children ? (
                    <>
                      <Link
                        to={getFirstSubMenuPath(item)}
                        className="site-header__link"
                        onClick={(event) => {
                          event.preventDefault()
                          handleCategoryClick(item)
                        }}
                      >
                        {item.title}
                      </Link>
                      <DropdownMenu
                        items={item.children}
                        isOpen={activeMenu === item.title}
                      />
                    </>
                  ) : (
                    <Link to={item.path} className="site-header__link">
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
                <a href={item.href} className="site-header__auth-link">
                  {item.label}
                </a>
              </span>
            ))}
          </div>

          <button
            type="button"
            className="site-header__hamburger"
            aria-expanded={isMobileMenuOpen}
            aria-controls="site-header-mobile-menu"
            aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            onClick={toggleMobileMenu}
          >
            ☰
          </button>
        </div>
      </header>

      <div
        className={`site-header__overlay${isMobileMenuOpen ? ' site-header__overlay--visible' : ''}`}
        aria-hidden={!isMobileMenuOpen}
        onClick={closeMobileMenu}
      />

      <aside
        id="site-header-mobile-menu"
        className={`site-header__drawer${isMobileMenuOpen ? ' site-header__drawer--open' : ''}`}
        aria-hidden={!isMobileMenuOpen}
        aria-label="모바일 메뉴"
      >
        <div className="site-header__drawer-header">
          <button
            type="button"
            className="site-header__drawer-close"
            aria-label="메뉴 닫기"
            onClick={closeMobileMenu}
          >
            X
          </button>
        </div>

        <nav className="site-header__drawer-nav" aria-label="모바일 주요 메뉴">
          <ul className="site-header__drawer-menu">
            {MENU_ITEMS.map((item) => (
              <li key={item.title} className="site-header__drawer-item">
                {item.children ? (
                  <>
                    <button
                      type="button"
                      className="site-header__drawer-trigger"
                      aria-expanded={expandedItem === item.title}
                      onClick={() => toggleAccordion(item.title)}
                    >
                      {item.title}
                    </button>
                    <ul
                      className={`site-header__drawer-submenu${
                        expandedItem === item.title ? ' site-header__drawer-submenu--open' : ''
                      }`}
                    >
                      {item.children.map((child) => (
                        <li key={child.path} className="site-header__drawer-submenu-item">
                          <Link
                            to={child.path}
                            className="site-header__drawer-submenu-link"
                            onClick={closeMobileMenu}
                          >
                            {child.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <Link
                    to={item.path}
                    className="site-header__drawer-link"
                    onClick={closeMobileMenu}
                  >
                    {item.title}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header__drawer-auth" aria-label="계정 메뉴">
          {AUTH_LINKS.map((item, index) => (
            <span key={item.href} className="site-header__auth-item">
              {index > 0 && (
                <span className="site-header__auth-separator" aria-hidden="true">
                  |
                </span>
              )}
              <a href={item.href} className="site-header__auth-link" onClick={closeMobileMenu}>
                {item.label}
              </a>
            </span>
          ))}
        </div>
      </aside>
    </div>
  )
}

export default SiteHeader
