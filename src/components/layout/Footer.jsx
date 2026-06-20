import { Link } from 'react-router-dom'
import { LOCATION_DATA } from '@/data/location'
import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <p className="footer__title">하늘사랑감리교회</p>
          <p className="footer__subtitle">Hanul Sarang Methodist Church</p>
        </div>
        <div className="footer__info">
          <p>{LOCATION_DATA.address}</p>
          <p>Tel. {LOCATION_DATA.phone}</p>
        </div>
        <p className="footer__copy">
          &copy; {new Date().getFullYear()} 하늘사랑감리교회. All rights reserved.
        </p>
        <Link to="/about/location" className="footer__link">
          오시는 길
        </Link>
      </div>
    </footer>
  )
}

export default Footer
