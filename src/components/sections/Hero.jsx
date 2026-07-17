import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { HOME_HERO } from '@/data/home'
import hero01 from '@/assets/images/hero/hero01.png'
import hero02 from '@/assets/images/hero/hero02.png'
import './Hero.css'

const heroImages = [hero01, hero02]
const SLIDE_INTERVAL = 5000

function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const goToSlide = useCallback((index) => {
    setCurrentSlide(index)
  }, [])

  useEffect(() => {
    heroImages.forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

  useEffect(() => {
    if (heroImages.length <= 1) {
      return undefined
    }

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length)
    }, SLIDE_INTERVAL)

    return () => clearInterval(timer)
  }, [currentSlide])

  return (
    <section className="hero hero-section" aria-label="메인 배너">
      <div
        className="hero__image-layer"
        onContextMenu={(event) => event.preventDefault()}
        aria-hidden="true"
      >
        <div className="hero__image-hit">
          <div className="hero__slider">
            {heroImages.map((src, index) => (
              <img
                key={src}
                src={src}
                alt=""
                draggable={false}
                className={`hero__slide hero__bg hero__slide--${index + 1}${
                  index === currentSlide ? ' hero__slide--active' : ''
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="hero__overlay" aria-hidden="true" />

      <div className="hero__content-wrap">
        <div className="hero__container">
          <div className="hero__content">
            <h1 className="hero__title">
              {(HOME_HERO.titleLines ?? [HOME_HERO.title]).map((line, index) => (
                <span
                  key={line}
                  className={`hero__title-line${
                    index > 0 ? ' hero__title-line--accent' : ''
                  }`}
                >
                  {line}
                </span>
              ))}
            </h1>
            <p className="hero__subtitle">
              <span className="hero__subtitle-desktop">
                {(HOME_HERO.subtitleLines ?? [HOME_HERO.subtitle]).map((line) => (
                  <span key={line} className="hero__subtitle-line">
                    {line}
                  </span>
                ))}
              </span>
              <span className="hero__subtitle-mobile">
                {(HOME_HERO.subtitleLinesMobile ?? HOME_HERO.subtitleLines ?? [HOME_HERO.subtitle]).map(
                  (line, index) => (
                    <span
                      key={`mobile-${line}`}
                      className={`hero__subtitle-line${
                        (HOME_HERO.subtitleMobileSpacedAfter ?? []).includes(index)
                          ? ' hero__subtitle-line--spaced'
                          : ''
                      }`}
                    >
                      {line}
                    </span>
                  ),
                )}
              </span>
            </p>
            <div className="hero__actions">
              <Link to={HOME_HERO.primaryCta.href} className="hero__btn hero__btn--primary">
                {HOME_HERO.primaryCta.label}
              </Link>
              <Link to={HOME_HERO.secondaryCta.href} className="hero__btn hero__btn--secondary">
                {HOME_HERO.secondaryCta.label}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {heroImages.length > 1 ? (
        <div className="hero__indicators" role="tablist" aria-label="슬라이드 선택">
          {heroImages.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === currentSlide}
              aria-label={`${index + 1}번째 슬라이드`}
              className={`hero__indicator${
                index === currentSlide ? ' hero__indicator--active' : ''
              }`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

export default Hero
