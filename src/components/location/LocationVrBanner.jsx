import { Link } from 'react-router-dom'
import './LocationVrBanner.css'

function LocationVrBanner() {
  return (
    <section className="location-vr" aria-label="360도 VR 시설 둘러보기">
      <div className="location-vr__content">
        <p className="location-vr__eyebrow">하늘사랑 공간을 미리 만나보세요!</p>
        <p className="location-vr__desc">360° VR로 교회를 둘러보실 수 있습니다.</p>
      </div>

      <div className="location-vr__badge" aria-hidden="true">
        <span className="location-vr__badge-text">360°</span>
      </div>

      <Link to="/about/facility-vr" className="location-vr__action">
        360° VR 둘러보기 &gt;
      </Link>
    </section>
  )
}

export default LocationVrBanner
