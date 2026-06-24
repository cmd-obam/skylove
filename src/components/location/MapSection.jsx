import KakaoRoughMap from '@/components/location/KakaoRoughMap'
import './MapSection.css'

function MapSection() {
  return (
    <section className="map-section" aria-label="교회 위치 지도">
      <div className="map-section__map">
        <KakaoRoughMap />
      </div>
    </section>
  )
}

export default MapSection
