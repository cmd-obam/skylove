import { useEffect, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import './BannerLightboxSlides.css'

const AUTO_SLIDE_MS = 4000

function SlideBody({ slide }) {
  if (!slide) {
    return null
  }

  if (slide.variant === 'nf-hero') {
    return (
      <div className="banner-lightbox-slides__copy banner-lightbox-slides__copy--nf">
        {slide.welcome ? (
          <p className="banner-lightbox-slides__welcome">
            <span className="banner-lightbox-slides__welcome-text">{slide.welcome}</span>
          </p>
        ) : null}
        <div className="banner-lightbox-slides__headline">
          {slide.lines.map((line, index) => (
            <span key={index} className="banner-lightbox-slides__line">
              {Array.isArray(line)
                ? line.map((part, partIndex) => (
                    <span
                      key={partIndex}
                      className={
                        part.accent ? 'banner-lightbox-slides__accent' : undefined
                      }
                    >
                      {part.text}
                    </span>
                  ))
                : line}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (slide.variant === 'headline') {
    return (
      <div className="banner-lightbox-slides__copy banner-lightbox-slides__copy--headline">
        <div className="banner-lightbox-slides__headline">
          {slide.lines.map((line) => (
            <span key={line} className="banner-lightbox-slides__line">
              {line}
            </span>
          ))}
        </div>
        <span className="banner-lightbox-slides__underline" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="banner-lightbox-slides__copy banner-lightbox-slides__copy--body">
      {slide.title ? <p className="banner-lightbox-slides__title">{slide.title}</p> : null}
      {slide.paragraphs
        ? slide.paragraphs.map((paragraph) => (
            <p key={paragraph} className="banner-lightbox-slides__paragraph">
              {paragraph}
            </p>
          ))
        : null}
      {slide.lines ? (
        <div className="banner-lightbox-slides__body-lines">
          {slide.lines.map((line) => (
            <span key={line} className="banner-lightbox-slides__line">
              {line}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function BannerLightboxSlides({ slides = [] }) {
  const [index, setIndex] = useState(0)
  const total = slides.length
  const current = slides[index] ?? null

  useEffect(() => {
    setIndex(0)
  }, [slides])

  useEffect(() => {
    if (total <= 1) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % total)
    }, AUTO_SLIDE_MS)

    return () => {
      window.clearInterval(timerId)
    }
  }, [total, index])

  if (!current || total === 0) {
    return null
  }

  const goTo = (nextIndex, event) => {
    event.stopPropagation()
    event.preventDefault()
    setIndex((nextIndex + total) % total)
  }

  return (
    <div className="banner-lightbox-slides" role="group" aria-roledescription="carousel">
      {total > 1 ? (
        <button
          type="button"
          className="banner-lightbox-slides__arrow banner-lightbox-slides__arrow--prev"
          onClick={(event) => goTo(index - 1, event)}
          aria-label="이전 문구"
        >
          <FiChevronLeft aria-hidden="true" />
        </button>
      ) : null}

      <div className="banner-lightbox-slides__stage" aria-live="polite">
        <SlideBody slide={current} />
      </div>

      {total > 1 ? (
        <button
          type="button"
          className="banner-lightbox-slides__arrow banner-lightbox-slides__arrow--next"
          onClick={(event) => goTo(index + 1, event)}
          aria-label="다음 문구"
        >
          <FiChevronRight aria-hidden="true" />
        </button>
      ) : null}

      {total > 1 ? (
        <div className="banner-lightbox-slides__dots" aria-hidden="true">
          {slides.map((slide, slideIndex) => (
            <span
              key={slide.id ?? slideIndex}
              className={`banner-lightbox-slides__dot${
                slideIndex === index ? ' banner-lightbox-slides__dot--active' : ''
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default BannerLightboxSlides
