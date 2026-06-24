import LocationHero from '@/components/location/LocationHero'
import MapSection from '@/components/location/MapSection'
import LocationInfo from '@/components/location/LocationInfo'
import './Location.css'

function Location() {
  return (
    <>
      <header className="location-page__header">
        <h1 className="location-page__title">오시는길</h1>
        <p className="location-page__subtitle">하늘사랑교회로 오시는 길을 안내합니다</p>
      </header>

      <LocationHero />
      <MapSection />
      <LocationInfo />
    </>
  )
}

export default Location
