import { Link, useLocation } from 'react-router-dom'
import '@/components/layout/CategorySidebar.css'
import './MemberMypageSidebar.css'

const MENU_ITEMS = [
  { id: 'profile', label: '내 정보', path: '/member/edit' },
  { id: 'change-password', label: '비밀번호 변경', path: '/mypage/change-password' },
]

function MemberMypageSidebar() {
  const { pathname } = useLocation()

  return (
    <aside className="category-sidebar member-mypage-sidebar" aria-label="회원 메뉴">
      <div className="category-sidebar__header">
        <h2 className="category-sidebar__title">회원정보</h2>
        <span className="category-sidebar__accent" aria-hidden="true" />
      </div>

      <nav className="category-sidebar__nav">
        <ul className="category-sidebar__list">
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.path

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
