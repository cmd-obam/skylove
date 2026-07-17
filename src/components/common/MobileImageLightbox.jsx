import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import useBodyScrollLock from '@/hooks/useBodyScrollLock'
import './MobileImageLightbox.css'

function MobileImageLightbox({ imageSrc, imageAlt = '', onClose, layout = 'stacked', children }) {
  useBodyScrollLock(true)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const handleDialogClick = (event) => {
    event.stopPropagation()
  }

  return createPortal(
    <div className="mobile-image-lightbox" role="presentation">
      <button
        type="button"
        className="mobile-image-lightbox__backdrop"
        onClick={onClose}
        aria-label="닫기"
      />
      <div
        className={`mobile-image-lightbox__dialog${
          layout === 'overlay' ? ' mobile-image-lightbox__dialog--overlay' : ''
        }`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={imageAlt || '이미지 크게 보기'}
        onClick={handleDialogClick}
      >
        <button type="button" className="mobile-image-lightbox__close" onClick={onClose}>
          <span aria-hidden="true">×</span>
          <span className="mobile-image-lightbox__close-text">닫기</span>
        </button>
        <div className="mobile-image-lightbox__scroll" data-scroll-lock-allow>
          {layout === 'overlay' ? (
            <div
              className="mobile-image-lightbox__overlay mobile-image-lightbox__overlay--close"
              onClick={onClose}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onClose()
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="이미지 닫기"
            >
              {children}
            </div>
          ) : (
            <>
              <button
                type="button"
                className="mobile-image-lightbox__image-button"
                onClick={onClose}
                aria-label="이미지 닫기"
              >
                <img src={imageSrc} alt={imageAlt} className="mobile-image-lightbox__image" />
              </button>
              {children ? <div className="mobile-image-lightbox__content">{children}</div> : null}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default MobileImageLightbox
