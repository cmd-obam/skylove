import KakaoRoughMap from '@/components/location/KakaoRoughMap'
import MapLinkBar from '@/components/location/MapLinkBar'
import mapSketchImage from '@/assets/images/location/location-map-sketch.png'
import './MapSection.css'

function MapSection() {
  return (
    <section className="map-section" aria-label="교회 위치 지도">
      <div className="map-section__grid">
        <div className="map-section__map">
          <KakaoRoughMap hideInfoHeader />
        </div>
        <figure className="map-section__sketch">
          <img
            src={mapSketchImage}
            alt="하늘사랑교회 주변 약도"
            className="map-section__sketch-img"
          />
        </figure>
      </div>
      <MapLinkBar />
    </section>
  )
}

export default MapSection
