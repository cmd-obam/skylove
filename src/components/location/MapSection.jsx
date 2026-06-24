import locationMapSketch from '@/assets/images/location/location-map-sketch.png'
import KakaoRoughMap from '@/components/location/KakaoRoughMap'
import './MapSection.css'

function MapSection() {
  return (
    <section className="map-section" aria-labelledby="map-section-title">
      <h2 id="map-section-title" className="map-section__title">
        찾아오시는 길
      </h2>
      <div className="map-section__grid">
        <div className="map-section__map-item map-section__map-item--kakao">
          <KakaoRoughMap />
        </div>
        <figure className="map-section__map-item">
          <img
            src={locationMapSketch}
            alt="하늘사랑교회 주변 약도"
            className="map-section__map-img"
          />
        </figure>
      </div>
    </section>
  )
}

export default MapSection
