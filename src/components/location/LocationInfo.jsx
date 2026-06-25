import { Link } from 'react-router-dom'
import { LOCATION_DATA } from '@/data/location'
import { WORSHIP_SCHEDULE } from '@/data/worship'
import './LocationInfo.css'

function IconPin() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5L17.5 13l4 1.5V18a1.5 1.5 0 0 1-1.5 1.5C9.8 19.5 4.5 14.2 4.5 6A1.5 1.5 0 0 1 6 4.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4.5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const WORSHIP_PATH = '/worship'

function LocationInfo() {
  return (
    <section className="location-info" aria-label="교회 연락처 및 예배 안내">
      <div className="location-info__card">
        <div className="location-info__column">
          <div className="location-info__header">
            <span className="location-info__icon" aria-hidden="true">
              <IconPin />
            </span>
            <span className="location-info__label">주소</span>
          </div>
          <p className="location-info__value">{LOCATION_DATA.address}</p>
        </div>

        <div className="location-info__column">
          <div className="location-info__header">
            <span className="location-info__icon" aria-hidden="true">
              <IconPhone />
            </span>
            <span className="location-info__label">전화번호</span>
          </div>
          <p className="location-info__value">
            <a href={`tel:${LOCATION_DATA.phone}`} className="location-info__phone-link">
              {LOCATION_DATA.phone}
            </a>
          </p>
        </div>

        <div className="location-info__column location-info__column--worship">
          <div className="location-info__header">
            <span className="location-info__icon" aria-hidden="true">
              <IconClock />
            </span>
            <span className="location-info__label">예배시간</span>
          </div>
          <div className="location-info__worship">
            <ul className="location-info__worship-list">
              {WORSHIP_SCHEDULE.map((item) => (
                <li key={item.id} className="location-info__worship-item">
                  <span className="location-info__worship-name">{item.name}</span>
                  <span className="location-info__worship-time">{item.time}</span>
                </li>
              ))}
            </ul>
            <Link to={WORSHIP_PATH} className="location-info__worship-link">
              예배안내 바로가기
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LocationInfo
