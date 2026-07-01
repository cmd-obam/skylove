import { Link } from 'react-router-dom'
import { FiHome } from 'react-icons/fi'
import '@/components/layout/CategorySidebar.css'
import './MemberMenuSidebar.css'

const MENU_ITEMS = [
  { id: 'login', label: '로그인' },
  { id: 'find-account', label: '아이디/비밀번호찾기' },
  { id: 'signup', label: '회원가입', path: '/signup' },
]

function MemberMenuSidebar({ activeTab, onTabChange }) {
  const isFindAccountActive = activeTab === 'find-id' || activeTab === 'find-password'

  return (
    <aside className="category-sidebar member-menu-sidebar" aria-label="회원 메뉴">
      <div className="category-sidebar__header">
        <h2 className="category-sidebar__title">회원메뉴</h2>
        <span className="category-sidebar__accent" aria-hidden="true" />
      </div>

      <nav className="category-sidebar__nav">
        <ul className="category-sidebar__list">
          {MENU_ITEMS.map((item) => {
            const isActive =
              item.id === 'login'
                ? activeTab === 'login'
                : item.id === 'find-account'
                  ? isFindAccountActive
                  : false

            if (item.path) {
              return (
                <li key={item.id} className="category-sidebar__item">
                  <Link to={item.path} className="category-sidebar__link">
                    <span className="category-sidebar__link-text">{item.label}</span>
                    <span className="category-sidebar__link-icon" aria-hidden="true">
                      +
                    </span>
                  </Link>
                </li>
              )
            }

            return (
              <li key={item.id} className="category-sidebar__item">
                <button
                  type="button"
                  className={`category-sidebar__link${
                    isActive ? ' category-sidebar__link--active' : ''
                  }`}
                  onClick={() => onTabChange(item.id === 'find-account' ? 'find-id' : item.id)}
                >
                  <span className="category-sidebar__link-text">{item.label}</span>
                  <span className="category-sidebar__link-icon" aria-hidden="true">
                    +
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

export default MemberMenuSidebar
