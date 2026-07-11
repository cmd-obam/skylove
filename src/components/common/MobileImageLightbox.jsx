import { useEffect } from 'react'
import './MobileImageLightbox.css'

function MobileImageLightbox({ imageSrc, imageAlt = '', onClose, children }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div className="mobile-image-lightbox" role="presentation">
      <button
        type="button"
        className="mobile-image-lightbox__backdrop"
        onClick={onClose}
        aria-label="닫기"
      />
      <div
        className="mobile-image-lightbox__dialog"
        role="dialog"
        aria-modal="true"
        aria-label={imageAlt || '이미지 크게 보기'}
      >
        <button type="button" className="mobile-image-lightbox__close" onClick={onClose}>
          <span aria-hidden="true">×</span>
          <span className="mobile-image-lightbox__close-text">닫기</span>
        </button>
        <div className="mobile-image-lightbox__scroll">
          <img src={imageSrc} alt={imageAlt} className="mobile-image-lightbox__image" />
          {children ? <div className="mobile-image-lightbox__content">{children}</div> : null}
        </div>
      </div>
    </div>
  )
}

export default MobileImageLightbox
