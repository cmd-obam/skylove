import { Link } from 'react-router-dom'
import { FiHome } from 'react-icons/fi'
import '@/components/Breadcrumb.css'

function AuthBreadcrumb({ label }) {
  return (
    <nav className="breadcrumb" aria-label="현재 페이지 위치">
      <ol className="breadcrumb__list">
        <li className="breadcrumb__item">
          <Link to="/" className="breadcrumb__link" aria-label="홈">
            <FiHome className="breadcrumb__home-icon" aria-hidden="true" />
          </Link>
        </li>
        <li className="breadcrumb__item">
          <span className="breadcrumb__separator" aria-hidden="true">
            &gt;
          </span>
          <span className="breadcrumb__current" aria-current="page">
            {label}
          </span>
        </li>
      </ol>
    </nav>
  )
}

export default AuthBreadcrumb
