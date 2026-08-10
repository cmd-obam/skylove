import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { LOCATION_DATA } from '@/data/location'
import Modal from '@/components/common/Modal'
import SitemapModal from '@/components/layout/SitemapModal'
import { FOOTER_MODALS, FOOTER_LEGAL_LINKS } from '@/data/footerPolicies'
import { useAuth } from '@/contexts/AuthContext'
import { formatVisitorCount, loadVisitorStats } from '@/services/analytics/visitorStats'
import './Footer.css'

function Footer() {
  const [activeModal, setActiveModal] = useState(null)
  const [visitorStats, setVisitorStats] = useState({ todayCount: null, totalCount: null })
  const location = useLocation()
  const { loading: authLoading } = useAuth()

  const openModal = (modalId) => {
    setActiveModal(modalId)
  }

  const closeModal = () => {
    setActiveModal(null)
  }

  useEffect(() => {
    closeModal()
  }, [location.pathname])

  useEffect(() => {
    if (authLoading) {
      return undefined
    }

    let cancelled = false

    async function loadStats(attempt = 0) {
      try {
        const stats = await loadVisitorStats()
        if (!cancelled) {
          setVisitorStats({
            todayCount: stats.todayCount,
            totalCount: stats.totalCount,
          })
        }
      } catch (error) {
        console.warn('[Footer] visitor stats load failed', error)
        if (!cancelled && attempt < 2) {
          window.setTimeout(() => {
            void loadStats(attempt + 1)
          }, 400 * (attempt + 1))
        }
      }
    }

    void loadStats()

    return () => {
      cancelled = true
    }
  }, [authLoading])

  const modal = activeModal && activeModal !== 'sitemap' ? FOOTER_MODALS[activeModal] : null
  const todayLabel =
    visitorStats.todayCount == null ? '—' : formatVisitorCount(visitorStats.todayCount)
  const totalLabel =
    visitorStats.totalCount == null ? '—' : formatVisitorCount(visitorStats.totalCount)

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

        <div className="footer__right">
          <div className="footer__stats" aria-label="방문자 통계">
            <div className="footer__stat">
              <span className="footer__stat-label">TODAY</span>
              <span className="footer__stat-value">{todayLabel}</span>
            </div>
            <div className="footer__stat">
              <span className="footer__stat-label">TOTAL</span>
              <span className="footer__stat-value">{totalLabel}</span>
            </div>
          </div>

          <div className="footer__donation">
            <p className="footer__donation-title">하늘사랑교회 온라인 헌금</p>
            <p className="footer__donation-account">
              <span className="footer__donation-bank">새마을금고</span>
              <span className="footer__donation-number">9002-1741-6264-5</span>
            </p>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <p className="footer__copyright">
          &copy; {new Date().getFullYear()} 하늘사랑교회. All rights reserved.
        </p>

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

      <SitemapModal isOpen={activeModal === 'sitemap'} onClose={closeModal} />

      <Modal isOpen={Boolean(modal)} title={modal?.title ?? ''} onClose={closeModal}>
        {modal?.content}
      </Modal>
    </footer>
  )
}

export default Footer
