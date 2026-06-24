import { Link, useLocation } from 'react-router-dom'
import { FiHome } from 'react-icons/fi'
import { getBreadcrumbItems } from '@/data/breadcrumb'
import './Breadcrumb.css'

function Breadcrumb() {
  const { pathname } = useLocation()
  const items = getBreadcrumbItems(pathname)

  return (
    <nav className="breadcrumb" aria-label="현재 페이지 위치">
      <ol className="breadcrumb__list">
        {items.map((item, index) => (
          <li key={`${item.path}-${item.label}`} className="breadcrumb__item">
            {index > 0 && (
              <span className="breadcrumb__separator" aria-hidden="true">
                &gt;
              </span>
            )}
            {item.isCurrent ? (
              <span className="breadcrumb__current" aria-current="page">
                {item.label}
              </span>
            ) : item.isHome ? (
              <Link to={item.path} className="breadcrumb__link" aria-label="홈">
                <FiHome className="breadcrumb__home-icon" aria-hidden="true" />
              </Link>
            ) : (
              <Link to={item.path} className="breadcrumb__link">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default Breadcrumb
