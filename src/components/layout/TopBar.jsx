import { Link } from 'react-router-dom'
import { TOPBAR_LEFT_LINKS, UTILITY_LINKS } from '@/data/menu'
import './TopBar.css'

function TopBar() {
  return (
    <div className="topbar" aria-label="유틸리티 메뉴">
      <div className="topbar__inner">
        <ul className="topbar__menu topbar__menu--left">
          {TOPBAR_LEFT_LINKS.map((item, index) => (
            <li key={item.path} className="topbar__item">
              {index > 0 && (
                <span className="topbar__separator" aria-hidden="true">
                  |
                </span>
              )}
              <Link to={item.path} className="topbar__link">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <ul className="topbar__menu topbar__menu--right">
          {UTILITY_LINKS.map((item, index) => (
            <li key={item.href} className="topbar__item">
              {index > 0 && (
                <span className="topbar__separator" aria-hidden="true">
                  |
                </span>
              )}
              {item.href === '/' ? (
                <Link to={item.href} className="topbar__link">
                  {item.label}
                </Link>
              ) : (
                <a href={item.href} className="topbar__link">
                  {item.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default TopBar
