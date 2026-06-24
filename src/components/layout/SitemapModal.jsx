import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MENU_ITEMS } from '@/data/menu'
import './SitemapModal.css'

function SitemapModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div className="sitemap-modal" role="presentation" onClick={onClose}>
      <div
        className="sitemap-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sitemap-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sitemap-modal__header">
          <div className="sitemap-modal__intro">
            <h2 id="sitemap-modal-title" className="sitemap-modal__title">
              사이트맵
            </h2>
            <p className="sitemap-modal__description">
              홈페이지에 오신것을 진심으로 환영합니다. 메뉴를 클릭하시면 해당페이지로
              이동합니다.
            </p>
          </div>
          <button
            type="button"
            className="sitemap-modal__close"
            aria-label="닫기"
            onClick={onClose}
          >
            &times;
          </button>
        </header>

        <div className="sitemap-modal__body">
          <div className="sitemap-modal__grid">
            {MENU_ITEMS.map((category) => (
              <section key={category.path} className="sitemap-modal__column">
                <h3 className="sitemap-modal__category">{category.title}</h3>
                <ul className="sitemap-modal__list">
                  {category.children ? (
                    category.children.map((item) => (
                      <li key={item.path} className="sitemap-modal__item">
                        <Link to={item.path} className="sitemap-modal__link" onClick={onClose}>
                          {item.title}
                        </Link>
                      </li>
                    ))
                  ) : (
                    <li className="sitemap-modal__item">
                      <Link to={category.path} className="sitemap-modal__link" onClick={onClose}>
                        {category.title}
                      </Link>
                    </li>
                  )}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SitemapModal
