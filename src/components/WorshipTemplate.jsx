import { useEffect, useRef } from 'react'
import footerCrossImage from '@/assets/images/worship/footer-cross-cloud.png'
import Breadcrumb from '@/components/Breadcrumb'
import MobileBannerExpand from '@/components/common/MobileBannerExpand'
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
      </div>
    )
  }

  return (
    <div
      className={`worship-template__image-slot worship-template__image-slot--placeholder worship-template__image-slot--${variant} ${className}`.trim()}
      role="img"
      aria-label="이미지 준비중"
    >
      <span className="worship-template__placeholder-text">이미지 준비중</span>
    </div>
  )
}

function WorshipTemplate({
  title,
  subtitle = 'Sunday Blessing Service',
  time,
  location,
  timeLabel = '예배시간',
  locationLabel = '장소',
  infoCardLayout = 'split',
  infoCardMobileLayout = 'stacked',
  headline,
  headlineLines = null,
  headlineRichLines = null,
  introTitle = null,
  description,
  descriptionLines = null,
  descriptionRichLines = null,
  descriptionParagraphs = null,
  heroImage = null,
  heroImageFit = 'contain',
  introImage = null,
  galleryImages = [null, null, null],
  galleryTitles = ['', '', ''],
  showGallery = true,
  footerMessage,
  crossIcon = null,
  introBannerVariant = null,
  introTypographyVariant = null,
  introLayout = 'banner',
  introBackgroundPosition = 'right center',
}) {
  const rootRef = useRef(null)
  const isSplitIntro = Boolean(introImage) && introLayout === 'split'
  const isBannerIntro = Boolean(introImage) && introLayout === 'banner'

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

    targets.forEach((target) => {
      target.classList.remove('worship-template__fade--visible')
      observer.observe(target)

      const rect = target.getBoundingClientRect()
      const isAlreadyVisible = rect.top < window.innerHeight * 0.92 && rect.bottom > 0

      if (isAlreadyVisible) {
        target.classList.add('worship-template__fade--visible')
        observer.unobserve(target)
      }
    })

    return () => observer.disconnect()
  }, [title])

  const galleryCount = Math.max(galleryImages.length, galleryTitles.length)
  const galleryItems = Array.from({ length: galleryCount }, (_, index) => ({
    title: galleryTitles[index] ?? '',
    src: galleryImages[index] ?? null,
  }))

  const introClassName = `worship-template__intro${
    isBannerIntro ? '' : ' worship-template__fade'
  }${isBannerIntro ? ' worship-template__intro--banner' : ''}${
    isSplitIntro ? ' worship-template__intro--split' : ''
  }${
    introBannerVariant ? ` worship-template__intro--banner-${introBannerVariant}` : ''
  }${
    introTypographyVariant ? ` worship-template__intro--typography-${introTypographyVariant}` : ''
  }`

  const introStyle = isBannerIntro
    ? {
        '--worship-intro-bg': `url(${introImage})`,
        ...(introBackgroundPosition !== 'right center'
          ? { '--worship-intro-bg-position': introBackgroundPosition }
          : {}),
      }
    : undefined

  const introText = (
    <div
      className="worship-template__intro-text"
      data-scroll-lock-allow
      onClick={(event) => {
        if (event.currentTarget.closest('.mobile-image-lightbox__overlay')) {
          event.stopPropagation()
        }
      }}
    >
      {introBannerVariant === 'dawn-prayer' && (
        <>
          <span className="worship-template__intro-cross" aria-hidden="true">
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
              <path d="M8 0v20M0 6h16" stroke="currentColor" strokeWidth="2" />
            </svg>
          </span>
          <div
            className="worship-template__intro-divider worship-template__intro-divider--top"
            aria-hidden="true"
          />
        </>
      )}
      <p className="worship-template__headline">
        {headlineRichLines
          ? headlineRichLines.map((line, lineIndex) => (
              <span key={lineIndex} className="worship-template__headline-line">
                {line.map((part, partIndex) => (
                  <span
                    key={partIndex}
                    className={part.accent ? 'worship-template__headline-accent' : undefined}
                  >
                    {part.text}
                  </span>
                ))}
              </span>
            ))
          : (headlineLines ?? [headline]).map((line) => (
              <span key={line} className="worship-template__headline-line">
                {line}
              </span>
            ))}
      </p>
      {introTitle && (
        <>
          <div className="worship-template__intro-divider" aria-hidden="true" />
          <p className="worship-template__intro-title">{introTitle}</p>
        </>
      )}
      {descriptionParagraphs ? (
        <div className="worship-template__description-blocks">
          {descriptionParagraphs.map((paragraph, paragraphIndex) => (
            <div key={paragraphIndex} className="worship-template__description-block">
              {paragraphIndex > 0 && (
                <div className="worship-template__description-divider" aria-hidden="true" />
              )}
              <p className="worship-template__description worship-template__description--rich">
                {paragraph.map((part, partIndex) => (
                  <span
                    key={partIndex}
                    className={part.accent ? 'worship-template__description-accent' : undefined}
                  >
                    {part.text}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>
      ) : descriptionRichLines ? (
        <p className="worship-template__description worship-template__description--rich">
          {descriptionRichLines.map((line, lineIndex) => (
            <span key={lineIndex} className="worship-template__description-line">
              {line.map((part, partIndex) => (
                <span
                  key={partIndex}
                  className={part.accent ? 'worship-template__description-accent' : undefined}
                >
                  {part.text}
                </span>
              ))}
            </span>
          ))}
        </p>
      ) : (
        <p className="worship-template__description">
          {(descriptionLines ?? [description]).map((line) => (
            <span key={line} className="worship-template__description-line">
              {line}
            </span>
          ))}
        </p>
      )}
    </div>
  )

  return (
    <article className="worship-template" ref={rootRef}>
      <header className="worship-template__header worship-template__fade">
        <div className="worship-template__heading">
          <h1 className="sub-layout__title">{title}</h1>
          {subtitle ? <p className="worship-template__subtitle">{subtitle}</p> : null}
        </div>
        <Breadcrumb />
      </header>

      <div className="worship-template__hero worship-template__fade">
        <ImageSlot
          src={heroImage}
          alt={`${title} 대표 이미지`}
          variant="hero"
          className={heroImageFit === 'cover' ? 'worship-template__image-slot--hero-fit-cover' : ''}
        />
      </div>

      <section
        className={`worship-template__info-card worship-template__fade${
          infoCardLayout === 'single' ? ' worship-template__info-card--single' : ''
        }${
          infoCardMobileLayout === 'inline' ? ' worship-template__info-card--mobile-inline' : ''
        }`}
        aria-label="예배 정보"
      >
        <div className="worship-template__info-item">
          <span className="worship-template__info-label">{timeLabel}</span>
          <p className="worship-template__info-value">{time}</p>
        </div>
        {infoCardLayout !== 'single' && (
          <>
            <div className="worship-template__info-divider" aria-hidden="true" />
            <div className="worship-template__info-item">
              <span className="worship-template__info-label">{locationLabel}</span>
              <p className="worship-template__info-value">{location}</p>
            </div>
          </>
        )}
      </section>

      {isBannerIntro ? (
        <MobileBannerExpand
          imageSrc={introImage}
          imageAlt={`${title} 소개`}
          className={introClassName}
          style={introStyle}
          lightboxLayout="overlay"
        >
          {introText}
        </MobileBannerExpand>
      ) : (
        <section className={introClassName} style={introStyle} aria-label="예배 소개">
          {introText}
          {(isSplitIntro || !introImage) && (
            <div className="worship-template__intro-media">
              <ImageSlot
                src={isSplitIntro ? introImage : null}
                alt={`${title} 소개 이미지`}
                variant="intro"
              />
            </div>
          )}
        </section>
      )}

      {showGallery && (
      <section className="worship-template__gallery worship-template__fade" aria-label="예배 모습">
        <ul
          className={`worship-template__gallery-list${
            galleryItems.length === 4 ? ' worship-template__gallery-list--quad' : ''
          }`}
        >
          {galleryItems.map((item, index) => (
            <li key={item.title || `${title}-gallery-${index}`} className="worship-template__gallery-item">
              <ImageSlot
                src={item.src}
                alt={item.title ? `${title} ${item.title}` : `${title} 사진 ${index + 1}`}
                label={item.title}
                variant="gallery"
                className="worship-template__gallery-card"
              />
            </li>
          ))}
        </ul>
      </section>
      )}

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
