import { LOCATION_DATA } from '@/data/location'
import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer__brand">
          <p className="footer__title">하늘사랑감리교회</p>
          <p className="footer__subtitle">Hanul Sarang Methodist Church</p>
        </div>

        <div className="footer__info">
          <p>{LOCATION_DATA.address}</p>
          <p>Tel. {LOCATION_DATA.phone}</p>
        </div>
      </div>

      <div className="footer__copyright">
        <p>&copy; {new Date().getFullYear()} 하늘사랑감리교회. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
