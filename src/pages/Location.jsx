import LocationHero from '@/components/location/LocationHero'
import MapSection from '@/components/location/MapSection'
import LocationInfo from '@/components/location/LocationInfo'
import LocationVisitorGuide from '@/components/location/LocationVisitorGuide'
import LocationVrBanner from '@/components/location/LocationVrBanner'
import './Location.css'

function Location() {
  return (
    <div className="location-page">
      <LocationHero />
      <div className="location-map-block">
        <MapSection />
        <LocationInfo />
      </div>
      <LocationVisitorGuide />
      <LocationVrBanner />
    </div>
  )
}

export default Location
