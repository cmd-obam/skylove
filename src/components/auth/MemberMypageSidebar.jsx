import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCmsAdmin } from '@/hooks/useCmsAdmin'
import { useSuperAdmin } from '@/hooks/useSuperAdmin'
import useIsCompactNav from '@/hooks/useIsCompactNav'
import '@/components/layout/CategorySidebar.css'
import './MemberMypageSidebar.css'

const BASE_MENU_ITEMS = [
  { id: 'profile', label: '내 정보', path: '/member/edit' },
  { id: 'change-password', label: '비밀번호 변경', path: '/mypage/change-password' },
]

const SUPER_ADMIN_CHILDREN = [
  { id: 'member-list', label: '회원관리', path: '/member/management' },
  { id: 'content-management', label: '게시글 & 댓글 관리', path: '/member/content-management' },
  { id: 'visitor-stats', label: '방문자통계', path: '/member/visitor-stats' },
  { id: 'reports', label: '신고관리 (추후)', path: null, disabled: true },
  { id: 'banned-words', label: '금칙어 관리 (추후)', path: null, disabled: true },
]

const CMS_ADMIN_CHILDREN = [
  { id: 'content-management', label: '게시글 & 댓글 관리', path: '/member/content-management' },
]

function MemberMypageSidebar() {
  const { pathname } = useLocation()
  const isCompactNav = useIsCompactNav()
  const { isSuperAdmin } = useSuperAdmin()
  const { isCmsAdmin } = useCmsAdmin()
  const adminChildren = isSuperAdmin ? SUPER_ADMIN_CHILDREN : isCmsAdmin ? CMS_ADMIN_CHILDREN : []
  const showAdminMenu = adminChildren.length > 0
  const isManagementPath =
    pathname.startsWith('/member/management') ||
    pathname.startsWith('/member/content-management') ||
    pathname.startsWith('/member/visitor-stats')
  const [isManagementExpanded, setIsManagementExpanded] = useState(isManagementPath)
  const adminTitle = isSuperAdmin ? '관리자' : isCmsAdmin ? '운영 관리' : '회원정보'
  const adminGroupLabel = isSuperAdmin ? '회원관리' : '콘텐츠 관리'
  const adminGroupPath = isSuperAdmin ? '/member/management' : '/member/content-management'

  useEffect(() => {
    if (isManagementPath) {
      setIsManagementExpanded(true)
    }
  }, [isManagementPath])

  // 모바일/태블릿은 햄버거 메뉴의 회원메뉴 하위를 사용하므로 본문 상단 카테고리를 렌더하지 않습니다.
  if (isCompactNav) {
    return null
  }

  return (
    <aside className="category-sidebar member-mypage-sidebar" aria-label="회원 메뉴">
      <div className="category-sidebar__header">
        <h2 className="category-sidebar__title">{adminTitle}</h2>
        <span className="category-sidebar__accent" aria-hidden="true" />
      </div>

      <nav className="category-sidebar__nav">
        <ul className="category-sidebar__list">
          {BASE_MENU_ITEMS.map((item) => (
            <li key={item.id} className="category-sidebar__item">
              <Link
                to={item.path}
                className={`category-sidebar__link${
                  pathname === item.path ? ' category-sidebar__link--active' : ''
                }`}
              >
                <span className="category-sidebar__link-text">{item.label}</span>
                <span className="category-sidebar__link-icon" aria-hidden="true">
                  +
                </span>
              </Link>
            </li>
          ))}

          {showAdminMenu ? (
            <li className="category-sidebar__item category-sidebar__item--expandable">
              <div
                className={`category-sidebar__link category-sidebar__group-row${
                  isManagementPath ? ' category-sidebar__link--active' : ''
                }`}
              >
                <Link to={adminGroupPath} className="category-sidebar__group-link">
                  <span className="category-sidebar__link-text">{adminGroupLabel}</span>
                </Link>
                <button
                  type="button"
                  className="category-sidebar__expand-toggle"
                  aria-expanded={isManagementExpanded}
                  aria-controls="admin-management-menu"
                  aria-label={`${adminGroupLabel} 하위 메뉴 ${isManagementExpanded ? '접기' : '펼치기'}`}
                  onClick={() => setIsManagementExpanded((current) => !current)}
                >
                  <span className="category-sidebar__link-icon" aria-hidden="true">
                    {isManagementExpanded ? '−' : '+'}
                  </span>
                </button>
              </div>

              <ul
                id="admin-management-menu"
                className={`category-sidebar__sublist${
                  isManagementExpanded ? ' category-sidebar__sublist--open' : ''
                }`}
              >
                {adminChildren.map((item) => (
                  <li key={item.id} className="category-sidebar__subitem">
                    {item.disabled || !item.path ? (
                      <span className="category-sidebar__sublink category-sidebar__sublink--disabled">
                        {item.label}
                      </span>
                    ) : (
                      <Link
                        to={item.path}
                        className={`category-sidebar__sublink${
                          pathname === item.path ||
                          (item.path === '/member/management' &&
                            pathname.startsWith('/member/management/'))
                            ? ' category-sidebar__sublink--active'
                            : ''
                        }`}
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ) : null}
        </ul>
      </nav>
    </aside>
  )
}

export default MemberMypageSidebar
