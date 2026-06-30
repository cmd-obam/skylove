import { useEffect, useRef } from 'react'
import footerCrossImage from '@/assets/images/worship/footer-cross.png'
import './WorshipTemplate.css'

function FooterDividerCross() {
  return (
    <img
      src={footerCrossImage}
      alt=""
      className="worship-template__footer-cross"
      aria-hidden="true"
    />
  )
}

function ImageSlot({ src, alt, label, variant = 'default', className = '' }) {
  if (src) {
    return (
      <div className={`worship-template__image-slot worship-template__image-slot--${variant} ${className}`.trim()}>
        <img src={src} alt={alt || label || ''} className="worship-template__image" loading="lazy" />
        {label && variant === 'gallery' && (
          <span className="worship-template__gallery-label">{label}</span>
        )}
      </div>
    )
  }

  return (
    <div
      className={`worship-template__image-slot worship-template__image-slot--placeholder worship-template__image-slot--${variant} ${className}`.trim()}
      role="img"
      aria-label={label ? `${label} 이미지 영역` : '이미지 영역'}
    >
      <span className="worship-template__placeholder-icon" aria-hidden="true">
        🖼
      </span>
      <span className="worship-template__placeholder-text">
        {label ? `${label} 이미지` : '이미지 영역'}
      </span>
    </div>
  )
}

function WorshipTemplate({
  title,
  subtitle = 'WORSHIP',
  time,
  location,
  timeLabel = '예배시간',
  locationLabel = '장소',
  headline,
  headlineLines = null,
  introTitle = null,
  description,
  descriptionLines = null,
  heroImage = null,
  introImage = null,
  galleryImages = [null, null, null],
  galleryTitles = ['찬양', '말씀', '교제'],
  footerMessage,
  crossIcon = null,
  introBannerVariant = null,
}) {
  const rootRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current

    if (!root) {
      return undefined
    }

    const targets = root.querySelectorAll('.worship-template__fade')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('worship-template__fade--visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )

    targets.forEach((target) => observer.observe(target))

    return () => observer.disconnect()
  }, [])

  const galleryItems = galleryTitles.map((galleryTitle, index) => ({
    title: galleryTitle,
    src: galleryImages[index] ?? null,
  }))

  return (
    <article className="worship-template" ref={rootRef}>
      <header className="worship-template__header worship-template__fade">
        <h2 className="worship-template__title">{title}</h2>
        <p className="worship-template__subtitle">{subtitle}</p>
        <div className="worship-template__title-line" aria-hidden="true" />
      </header>

      <div className="worship-template__hero worship-template__fade">
        <ImageSlot src={heroImage} alt={`${title} 대표 이미지`} variant="hero" />
      </div>

      <section className="worship-template__info-card worship-template__fade" aria-label="예배 정보">
        <div className="worship-template__info-item">
          <span className="worship-template__info-label">{timeLabel}</span>
          <p className="worship-template__info-value">{time}</p>
        </div>
        <div className="worship-template__info-divider" aria-hidden="true" />
        <div className="worship-template__info-item">
          <span className="worship-template__info-label">{locationLabel}</span>
          <p className="worship-template__info-value">{location}</p>
        </div>
      </section>

      <section
        className={`worship-template__intro worship-template__fade${
          introImage ? ' worship-template__intro--banner' : ''
        }${
          introBannerVariant
            ? ` worship-template__intro--banner-${introBannerVariant}`
            : ''
        }`}
        style={introImage ? { '--worship-intro-bg': `url(${introImage})` } : undefined}
        aria-label="예배 소개"
      >
        <div className="worship-template__intro-text">
          <p className="worship-template__headline">
            {(headlineLines ?? [headline]).map((line) => (
              <span key={line} className="worship-template__headline-line">
                {line}
              </span>
            ))}
          </p>
          {introTitle && (
            <>
              <div
                className={`worship-template__intro-divider${
                  introBannerVariant === 'choir'
                    ? ' worship-template__intro-divider--diamond'
                    : ''
                }`}
                aria-hidden="true"
              >
                {introBannerVariant === 'choir' && (
                  <span className="worship-template__intro-divider-diamond" />
                )}
              </div>
              <p className="worship-template__intro-title">{introTitle}</p>
            </>
          )}
          <p className="worship-template__description">
            {(descriptionLines ?? [description]).map((line) => (
              <span key={line} className="worship-template__description-line">
                {line}
              </span>
            ))}
          </p>
        </div>
        {!introImage && (
          <div className="worship-template__intro-media">
            <ImageSlot alt={`${title} 소개 이미지`} variant="intro" />
          </div>
        )}
      </section>

      <section className="worship-template__gallery worship-template__fade" aria-label="예배 모습">
        <ul className="worship-template__gallery-list">
          {galleryItems.map((item) => (
            <li key={item.title} className="worship-template__gallery-item">
              <ImageSlot
                src={item.src}
                alt={`${title} ${item.title}`}
                label={item.title}
                variant="gallery"
                className="worship-template__gallery-card"
              />
            </li>
          ))}
        </ul>
      </section>

      <footer className="worship-template__footer worship-template__fade">
        <p className="worship-template__footer-message">{footerMessage}</p>
        <div className="worship-template__footer-divider" aria-hidden="true">
          <span className="worship-template__footer-line" />
          {crossIcon ?? <FooterDividerCross />}
          <span className="worship-template__footer-line" />
        </div>
      </footer>
    </article>
  )
}

export default WorshipTemplate
