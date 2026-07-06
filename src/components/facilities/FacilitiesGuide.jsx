import { useCallback, useEffect, useState } from 'react'
import Breadcrumb from '@/components/Breadcrumb'
import { FACILITIES_GUIDE } from '@/data/facilitiesGuide'
import './FacilitiesGuide.css'

function FacilityImageLightbox({ src, alt, onClose }) {
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
    <div className="facilities-lightbox" role="presentation">
      <button
        type="button"
        className="facilities-lightbox__backdrop"
        onClick={onClose}
        aria-label="이미지 닫기"
      />
      <div
        className="facilities-lightbox__dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${alt} 원본 이미지`}
      >
        <button type="button" className="facilities-lightbox__close" onClick={onClose}>
          닫기
        </button>
        <img src={src} alt={alt} className="facilities-lightbox__image" />
      </div>
    </div>
  )
}

function FacilityImageGrid({ images, label, layout = 'grid' }) {
  const [lightbox, setLightbox] = useState(null)

  const openLightbox = useCallback((src, alt) => {
    setLightbox({ src, alt })
  }, [])

  const closeLightbox = useCallback(() => {
    setLightbox(null)
  }, [])

  const galleryClassName =
    layout === 'mosaic'
      ? 'facilities__gallery facilities__gallery--mosaic'
      : 'facilities__gallery'

  return (
    <>
      <ul className={galleryClassName}>
        {images.map((src, index) => (
          <li
            key={`${label}-${index}`}
            className={`facilities__gallery-item${
              layout === 'mosaic' && index === 0 ? ' facilities__gallery-item--featured' : ''
            }`}
          >
            <button
              type="button"
              className="facilities__gallery-trigger"
              onClick={() => openLightbox(src, `${label} ${index + 1}`)}
              aria-label={`${label} ${index + 1} 원본 보기`}
            >
              <img
                src={src}
                alt={`${label} ${index + 1}`}
                className="facilities__gallery-image"
                loading="lazy"
              />
            </button>
          </li>
        ))}
      </ul>

      {lightbox && (
        <FacilityImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={closeLightbox} />
      )}
    </>
  )
}

function FacilitiesGuide({
  pageTitle = FACILITIES_GUIDE.pageTitle,
  sections = FACILITIES_GUIDE.sections,
}) {
  return (
    <article className="facilities">
      <div className="facilities__top">
        <Breadcrumb />
      </div>

      <header className="facilities__page-header">
        <h1 className="facilities__page-title">{pageTitle}</h1>
        <div className="facilities__page-divider" aria-hidden="true">
          <span className="facilities__page-divider-line" />
          <span className="facilities__page-divider-dot" />
          <span className="facilities__page-divider-line" />
        </div>
      </header>

      <div className="facilities__sections">
        {sections.map((section) => (
          <section
            key={section.id}
            className="facilities__section"
            aria-labelledby={`facilities-section-${section.id}`}
          >
            <h2 id={`facilities-section-${section.id}`} className="facilities__section-title">
              {section.title}
            </h2>

            {section.subsections ? (
              <div className="facilities__subsections">
                {section.subsections.map((subsection) => (
                  <div
                    key={subsection.id}
                    className={`facilities__subsection${
                      !subsection.images?.length ? ' facilities__subsection--label-only' : ''
                    }`}
                  >
                    <h3 className="facilities__subsection-title">{subsection.label}</h3>
                    {subsection.images?.length > 0 && (
                      <FacilityImageGrid
                        images={subsection.images}
                        label={subsection.label}
                        layout={subsection.layout}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <FacilityImageGrid
                images={section.images}
                label={section.title}
                layout={section.layout}
              />
            )}
          </section>
        ))}
      </div>
    </article>
  )
}

export default FacilitiesGuide
