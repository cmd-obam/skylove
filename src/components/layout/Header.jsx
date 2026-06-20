import { Link } from 'react-router-dom'
import './Header.css'

function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__brand" aria-label="하늘사랑감리교회 홈으로 이동">
          <span className="header__title">하늘사랑감리교회</span>
          <span className="header__subtitle">Hanul Sarang Methodist Church</span>
        </Link>
      </div>
    </header>
  )
}

export default Header
