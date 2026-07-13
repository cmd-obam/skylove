import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

function AlbumImageLightbox({ src, alt, onClose }) {
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

  return createPortal(
    <div className="album-lightbox" role="presentation">
      <button
        type="button"
        className="album-lightbox__backdrop"
        onClick={onClose}
        aria-label="이미지 닫기"
      />
      <div
        className="album-lightbox__dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${alt} 원본 이미지`}
      >
        <button type="button" className="album-lightbox__close" onClick={onClose}>
          닫기
        </button>
        <button
          type="button"
          className="album-lightbox__image-button"
          onClick={onClose}
          aria-label="이미지 닫기"
        >
          <img src={src} alt={alt} className="album-lightbox__image" draggable={false} />
        </button>
      </div>
    </div>,
    document.body,
  )
}

function AlbumImageGallery({ images = [], title = '앨범' }) {
  const [lightbox, setLightbox] = useState(null)

  const openLightbox = useCallback((src, alt) => {
    setLightbox({ src, alt })
  }, [])

  const closeLightbox = useCallback(() => {
    setLightbox(null)
  }, [])

  if (images.length === 0) {
    return null
  }

  return (
    <section className="album-gallery" aria-label={`${title} 사진 갤러리`} id="album-gallery">
      <h3 className="album-gallery__heading">사진 갤러리</h3>
      <ul className="album-gallery__grid">
        {images.map((image, index) => (
          <li key={`${image.src}-${index}`} className="album-gallery__item">
            <button
              type="button"
              className="album-gallery__trigger"
              onClick={() => openLightbox(image.src, image.alt || `${title} 사진 ${index + 1}`)}
              aria-label={`${title} 사진 ${index + 1} 원본 보기`}
            >
              <img
                src={image.src}
                alt={image.alt || `${title} 사진 ${index + 1}`}
                className="album-gallery__image"
                loading="lazy"
              />
            </button>
          </li>
        ))}
      </ul>

      {lightbox && (
        <AlbumImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={closeLightbox} />
      )}
    </section>
  )
}

export default AlbumImageGallery
