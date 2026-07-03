import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { HOME_HERO } from '@/data/home'
import hero01 from '@/assets/images/hero/hero01.png'
import hero02 from '@/assets/images/hero/hero02.jpg'
import hero03 from '@/assets/images/hero/hero03.png'
import './Hero.css'

const heroImages = [hero01, hero02, hero03]
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
        <div className="hero__slider">
          {heroImages.map((src, index) => (
            <img
              key={src}
              src={src}
              alt=""
              draggable={false}
              className={`hero__slide hero__bg${
                index === currentSlide ? ' hero__slide--active' : ''
              }`}
            />
          ))}
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
            <p className="hero__subtitle">{HOME_HERO.subtitle}</p>
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
    </section>
  )
}

export default Hero
