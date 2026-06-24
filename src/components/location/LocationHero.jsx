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
      />
    </div>
  )
}

export default LocationHero
