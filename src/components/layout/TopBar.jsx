import { UTILITY_LINKS } from '@/data/menu'
import './TopBar.css'

function TopBar() {
  return (
    <div className="topbar" aria-label="유틸리티 메뉴">
      <div className="topbar__inner">
        <ul className="topbar__menu">
          {UTILITY_LINKS.map((item, index) => (
            <li key={item.href} className="topbar__item">
              {index > 0 && (
                <span className="topbar__separator" aria-hidden="true">
                  |
                </span>
              )}
              <a href={item.href} className="topbar__link">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default TopBar
