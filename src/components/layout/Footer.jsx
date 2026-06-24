import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { LOCATION_DATA } from '@/data/location'
import Modal from '@/components/common/Modal'
import SitemapModal from '@/components/layout/SitemapModal'
import { FOOTER_MODALS, FOOTER_LEGAL_LINKS } from '@/data/footerPolicies'
import './Footer.css'

function Footer() {
  const [activeModal, setActiveModal] = useState(null)
  const location = useLocation()

  const openModal = (modalId) => {
    setActiveModal(modalId)
  }

  const closeModal = () => {
    setActiveModal(null)
  }

  useEffect(() => {
    closeModal()
  }, [location.pathname])

  const modal = activeModal && activeModal !== 'sitemap' ? FOOTER_MODALS[activeModal] : null

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer__left">
          <div className="footer__brand">
            <p className="footer__title">하늘사랑교회</p>
            <p className="footer__subtitle">Heavenly Love Church</p>
          </div>

          <div className="footer__info">
            <p>
              <span className="footer__info-label">주소</span>
              {LOCATION_DATA.address}
            </p>
            <p>
              <span className="footer__info-label">전화</span>
              {LOCATION_DATA.phone}
            </p>
          </div>
        </div>

        <nav className="footer__legal" aria-label="푸터 정책 메뉴">
          <ul className="footer__legal-list">
            {FOOTER_LEGAL_LINKS.map((item) => (
              <li key={item.id} className="footer__legal-item">
                <button
                  type="button"
                  className="footer__legal-link"
                  onClick={() => openModal(item.id)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="footer__copyright">
        <p>
          &copy; {new Date().getFullYear()} 하늘사랑교회. All rights reserved.
        </p>
      </div>

      <SitemapModal isOpen={activeModal === 'sitemap'} onClose={closeModal} />

      <Modal isOpen={Boolean(modal)} title={modal?.title ?? ''} onClose={closeModal}>
        {modal?.content}
      </Modal>
    </footer>
  )
}

export default Footer
