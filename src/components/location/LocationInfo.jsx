import { LOCATION_DATA } from '@/data/location'
import './LocationInfo.css'

const INFO_ITEMS = [
  { icon: '📍', label: '주소', value: LOCATION_DATA.address },
  { icon: '☎', label: '전화', value: LOCATION_DATA.phone },
  { icon: '⛪', label: '교회명', value: LOCATION_DATA.churchName },
]

function LocationInfo() {
  return (
    <section className="location-info" aria-label="교회 연락처 정보">
      <div className="location-info__card">
        <ul className="location-info__list">
          {INFO_ITEMS.map((item) => (
            <li key={item.label} className="location-info__item">
              <span className="location-info__icon" aria-hidden="true">
                {item.icon}
              </span>
              <div className="location-info__content">
                <span className="location-info__label">{item.label}</span>
                <span className="location-info__value">{item.value}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default LocationInfo
