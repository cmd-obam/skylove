import { Link } from 'react-router-dom'
import { LOCATION_DATA } from '@/data/location'
import './LocationInfo.css'

function IconPin() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5L17.5 13l4 1.5V18a1.5 1.5 0 0 1-1.5 1.5C9.8 19.5 4.5 14.2 4.5 6A1.5 1.5 0 0 1 6 4.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4.5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

const CONTACT_ITEMS = [
  { id: 'address', icon: IconPin, label: '주소', value: LOCATION_DATA.address },
  { id: 'phone', icon: IconPhone, label: '전화번호', value: LOCATION_DATA.phone },
  {
    id: 'worship',
    icon: IconClock,
    label: '예배시간',
    value: LOCATION_DATA.sundayWorship,
    hasAction: true,
  },
]

function LocationInfo() {
  return (
    <section className="location-info" aria-label="교회 연락처 및 예배 안내">
      <div className="location-info__card">
        {CONTACT_ITEMS.map((item) => (
          <div key={item.id} className="location-info__column">
            <span className="location-info__icon" aria-hidden="true">
              <item.icon />
            </span>
            <div className="location-info__body">
              <span className="location-info__label">{item.label}</span>
              <span className="location-info__value">{item.value}</span>
              {item.hasAction && (
                <Link to="/worship" className="location-info__action">
                  예배안내 바로가기 &gt;
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default LocationInfo
