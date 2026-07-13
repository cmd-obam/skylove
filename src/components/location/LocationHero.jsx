import Breadcrumb from '@/components/Breadcrumb'
import MobileBannerExpand from '@/components/common/MobileBannerExpand'
import { getPageMeta } from '@/data/pageMeta'
import heroBannerImage from '@/assets/images/location/location-hero.png'
import './LocationHero.css'

const LOCATION_PATH = '/about/location'

function LocationHero() {
  const { title } = getPageMeta(LOCATION_PATH)

  return (
    <div className="location-hero-wrap">
      <header className="location-hero__page-header">
        <div className="location-hero__page-heading">
          <h1 className="sub-layout__title">{title}</h1>
        </div>
        <Breadcrumb />
      </header>
      <MobileBannerExpand
        imageSrc={heroBannerImage}
        imageAlt="찾아오시는 길"
        className="location-hero"
        showHeadlineOverlay={false}
        style={{ '--location-hero-bg': `url(${heroBannerImage})` }}
      >
        <div className="location-hero__content">
          <p className="location-hero__welcome">Welcome to Heavenly Love Church</p>
          <p className="location-hero__tagline">하늘사랑감리교회는</p>
          <p className="location-hero__tagline">
            언제나 <span className="location-hero__highlight">여러분</span>을 기다리고 있습니다.
          </p>
        </div>
      </MobileBannerExpand>
    </div>
  )
}

export default LocationHero
