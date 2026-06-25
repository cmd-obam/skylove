import Breadcrumb from '@/components/Breadcrumb'
import heroBannerImage from '@/assets/images/location/location-hero.png'
import './LocationHero.css'

function LocationHero() {
  return (
    <div className="location-hero-wrap">
      <div className="location-hero__breadcrumb">
        <Breadcrumb />
      </div>
      <section
        className="location-hero"
        aria-label="찾아오시는 길"
        style={{ '--location-hero-bg': `url(${heroBannerImage})` }}
      >
        <div className="location-hero__content">
          <p className="location-hero__welcome">Welcome to Heavenly Love Church</p>
          <h1 className="location-hero__title">찾아오시는 길</h1>
          <p className="location-hero__tagline">하늘사랑감리교회는</p>
          <p className="location-hero__tagline">
            언제나 <span className="location-hero__highlight">여러분</span>을 기다리고 있습니다.
          </p>
        </div>
      </section>
    </div>
  )
}

export default LocationHero
