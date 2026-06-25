import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import hero01 from '@/assets/images/hero/hero01.jpg'
import hero02 from '@/assets/images/hero/hero02.jpg'
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

      <div className="hero__content">
        <p className="hero__eyebrow">WELCOME TO OUR COMMUNITY</p>
        <h1 className="hero__title">하늘사랑교회</h1>
        <p className="hero__subtitle">하나님을 만나 사람이 행복한 교회</p>
        <div className="hero__actions">
          <Link to="/about" className="hero__btn hero__btn--primary">
            교회소개
          </Link>
          <Link to="/worship" className="hero__btn hero__btn--secondary">
            예배시간 안내
          </Link>
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
