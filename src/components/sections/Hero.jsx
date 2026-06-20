import { Link } from 'react-router-dom'
import heroChurch from '@/assets/images/hero-church.png'
import './Hero.css'

function Hero() {
  return (
    <section
      className="hero"
      aria-label="메인 배너"
      style={{ '--hero-bg-image': `url(${heroChurch})` }}
    >
      <div className="hero__content">
        <p className="hero__eyebrow">WELCOME TO OUR COMMUNITY</p>
        <h1 className="hero__title">하늘사랑감리교회</h1>
        <p className="hero__subtitle">하나님의 사랑으로 세상을 섬기는 공동체</p>
        <div className="hero__actions">
          <Link to="/about" className="hero__btn hero__btn--primary">
            교회소개
          </Link>
          <Link to="/worship" className="hero__btn hero__btn--secondary">
            예배안내
          </Link>
        </div>
      </div>
    </section>
  )
}

export default Hero
