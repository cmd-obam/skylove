import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import churchLogo from '@/assets/images/church-logo.png'
import { AUTH_LINKS, MENU_ITEMS, getFirstSubMenuPath, menuItemContainsPath } from '@/data/menu'
import DropdownMenu from '@/components/layout/DropdownMenu'
import MenuItemLabel from '@/components/layout/MenuItemLabel'
import { useAuth } from '@/contexts/AuthContext'
import './SiteHeader.css'

function getAuthLinkPath(item) {
  if (item.tab) {
    return { pathname: item.path, search: `?tab=${item.tab}` }
  }

  return item.path
}

function renderAuthLink(item, onNavigate) {
  if (item.onClick) {
    return (
      <button type="button" className="site-header__auth-link" onClick={item.onClick}>
        {item.label}
      </button>
    )
  }

  return (
    <Link to={getAuthLinkPath(item)} className="site-header__auth-link" onClick={onNavigate}>
      {item.label}
    </Link>
  )
}

function SiteHeader() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { isLoggedIn, signOut } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState(null)
  const [expandedItem, setExpandedItem] = useState(null)
  const [expandedSubItem, setExpandedSubItem] = useState(null)

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
    setExpandedItem(null)
    setExpandedSubItem(null)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev)
    if (isMobileMenuOpen) {
      setExpandedItem(null)
      setExpandedSubItem(null)
    }
  }

  const toggleAccordion = (title) => {
    setExpandedItem((prev) => (prev === title ? null : title))
  }

  const toggleSubAccordion = (path) => {
    setExpandedSubItem((prev) => (prev === path ? null : path))
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

  const handleLogout = useCallback(async () => {
    try {
      await signOut()
      closeMobileMenu()
      navigate('/')
    } catch {
      // signOut error logged in AuthContext
    }
  }, [signOut, navigate])

  const authLinks = useMemo(
    () =>
      isLoggedIn
        ? [
            { label: '회원정보', path: '/member/edit' },
            { label: '로그아웃', onClick: handleLogout },
          ]
        : AUTH_LINKS,
    [isLoggedIn, handleLogout],
  )

  useEffect(() => {
    if (!isMobileMenuOpen) {
      document.body.style.overflow = ''
      return undefined
    }

    document.body.style.overflow = 'hidden'

    const aboutSection = MENU_ITEMS.find((item) => item.title === '교회소개')
    const tourItem = aboutSection?.children?.find((child) => child.children?.length)

    if (tourItem && menuItemContainsPath(tourItem, pathname)) {
      setExpandedItem('교회소개')
      setExpandedSubItem(tourItem.path)
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen, pathname])

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
      <div className="site-header__align">
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
            {authLinks.map((item, index) => (
              <span key={item.label} className="site-header__auth-item">
                {index > 0 && (
                  <span className="site-header__auth-separator" aria-hidden="true">
                    |
                  </span>
                )}
                {renderAuthLink(item)}
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
        </div>

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
            <li className="site-header__drawer-item">
              <Link to="/" className="site-header__drawer-link" onClick={closeMobileMenu}>
                홈
              </Link>
            </li>
            {MENU_ITEMS.map((item) => (
              <li key={item.title} className="site-header__drawer-item">
                {item.children ? (
                  <>
                    <div className="site-header__drawer-item-header">
                      <button
                        type="button"
                        className="site-header__drawer-link site-header__drawer-link--category"
                        aria-expanded={expandedItem === item.title}
                        aria-label={`${item.title} 하위 메뉴 펼치기`}
                        onClick={() => toggleAccordion(item.title)}
                      >
                        <span>{item.title}</span>
                        <span
                          className={`site-header__drawer-expand${
                            expandedItem === item.title ? ' site-header__drawer-expand--open' : ''
                          }`}
                          aria-hidden="true"
                        >
                          <span>+</span>
                        </span>
                      </button>
                    </div>
                    <ul
                      className={`site-header__drawer-submenu${
                        expandedItem === item.title ? ' site-header__drawer-submenu--open' : ''
                      }`}
                    >
                      {item.children.map((child) =>
                        child.children?.length ? (
                          <li
                            key={child.path}
                            className="site-header__drawer-submenu-item site-header__drawer-submenu-item--expandable"
                          >
                            <div className="site-header__drawer-submenu-header">
                              <button
                                type="button"
                                className="site-header__drawer-submenu-link site-header__drawer-submenu-link--toggle"
                                aria-expanded={expandedSubItem === child.path}
                                aria-label={`${child.title} 하위 메뉴 펼치기`}
                                onClick={() => toggleSubAccordion(child.path)}
                              >
                                <span>{child.title}</span>
                                <span
                                  className={`site-header__drawer-expand site-header__drawer-expand--sub${
                                    expandedSubItem === child.path
                                      ? ' site-header__drawer-expand--open'
                                      : ''
                                  }`}
                                  aria-hidden="true"
                                >
                                  <span>+</span>
                                </span>
                              </button>
                            </div>
                            <ul
                              className={`site-header__drawer-submenu-nested${
                                expandedSubItem === child.path
                                  ? ' site-header__drawer-submenu-nested--open'
                                  : ''
                              }`}
                            >
                              {child.children.map((subItem) => (
                                <li
                                  key={subItem.path}
                                  className="site-header__drawer-submenu-item"
                                >
                                  <Link
                                    to={subItem.path}
                                    className="site-header__drawer-submenu-link site-header__drawer-submenu-link--nested"
                                    onClick={closeMobileMenu}
                                  >
                                    <MenuItemLabel item={subItem} />
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ) : (
                          <li key={child.path} className="site-header__drawer-submenu-item">
                            <Link
                              to={child.path}
                              className="site-header__drawer-submenu-link"
                              onClick={closeMobileMenu}
                            >
                              {child.title}
                            </Link>
                          </li>
                        ),
                      )}
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
          {authLinks.map((item, index) => (
            <span key={item.label} className="site-header__auth-item">
              {index > 0 && (
                <span className="site-header__auth-separator" aria-hidden="true">
                  |
                </span>
              )}
              {renderAuthLink(item, closeMobileMenu)}
            </span>
          ))}
        </div>
      </aside>
    </div>
  )
}

export default SiteHeader
