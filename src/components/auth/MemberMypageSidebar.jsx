import { Link, useLocation } from 'react-router-dom'
import { useSuperAdmin } from '@/hooks/useSuperAdmin'
import '@/components/layout/CategorySidebar.css'
import './MemberMypageSidebar.css'

const BASE_MENU_ITEMS = [
  { id: 'profile', label: '내 정보', path: '/member/edit' },
  { id: 'change-password', label: '비밀번호 변경', path: '/mypage/change-password' },
]

const SUPER_ADMIN_MENU_ITEMS = [
  { id: 'member-management', label: '회원관리', path: '/member/management' },
  { id: 'content-management', label: '게시글 & 댓글 관리', path: '/member/content-management' },
  { id: 'visitor-stats', label: '방문자 통계', path: '/member/visitor-stats' },
  { id: 'reports', label: '신고관리 (추후)', path: null, disabled: true },
  { id: 'banned-words', label: '금칙어 관리 (추후)', path: null, disabled: true },
]

function MemberMypageSidebar() {
  const { pathname } = useLocation()
  const { isSuperAdmin } = useSuperAdmin()

  const menuItems = isSuperAdmin
    ? [...BASE_MENU_ITEMS, ...SUPER_ADMIN_MENU_ITEMS]
    : BASE_MENU_ITEMS

  return (
    <aside className="category-sidebar member-mypage-sidebar" aria-label="회원 메뉴">
      <div className="category-sidebar__header">
        <h2 className="category-sidebar__title">{isSuperAdmin ? '관리자' : '회원정보'}</h2>
        <span className="category-sidebar__accent" aria-hidden="true" />
      </div>

      <nav className="category-sidebar__nav">
        <ul className="category-sidebar__list">
          {menuItems.map((item) => {
            const isActive =
              item.path &&
              (pathname === item.path ||
                (item.path !== '/member/management' && pathname.startsWith(`${item.path}/`)) ||
                (item.path === '/member/management' &&
                  pathname.startsWith('/member/management')))

            if (item.disabled || !item.path) {
              return (
                <li key={item.id} className="category-sidebar__item">
                  <span className="category-sidebar__link category-sidebar__link--disabled">
                    <span className="category-sidebar__link-text">{item.label}</span>
                  </span>
                </li>
              )
            }

            return (
              <li key={item.id} className="category-sidebar__item">
                <Link
                  to={item.path}
                  className={`category-sidebar__link${
                    isActive ? ' category-sidebar__link--active' : ''
                  }`}
                >
                  <span className="category-sidebar__link-text">{item.label}</span>
                  <span className="category-sidebar__link-icon" aria-hidden="true">
                    +
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

export default MemberMypageSidebar
