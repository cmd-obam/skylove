import Breadcrumb from '@/components/Breadcrumb'
import MobileBannerExpand from '@/components/common/MobileBannerExpand'
import { getPageMeta } from '@/data/pageMeta'
import heroBannerImage from '@/assets/images/location/location-hero.png'
import './LocationHero.css'

const LOCATION_PATH = '/about/location'

const HEADLINE_LINES = ['하늘사랑감리교회는', '언제나 여러분을 기다리고 있습니다.']

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
          <p className="location-hero__headline">
            {HEADLINE_LINES.map((line) => (
              <span key={line} className="location-hero__headline-line">
                {line}
              </span>
            ))}
          </p>
          <span className="location-hero__divider" aria-hidden="true" />
          <p className="location-hero__welcome">Welcome to Heavenly Love Church</p>
        </div>
      </MobileBannerExpand>
    </div>
  )
}

export default LocationHero
