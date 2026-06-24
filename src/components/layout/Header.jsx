import { Link } from 'react-router-dom'
import churchLogo from '@/assets/images/church-logo.png'
import './Header.css'

function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__brand" aria-label="하늘사랑교회 홈으로 이동">
          <img
            src={churchLogo}
            alt=""
            className="header__logo"
            aria-hidden="true"
          />
          <span className="header__title">하늘사랑교회</span>
        </Link>
      </div>
    </header>
  )
}

export default Header
