import { Link } from 'react-router-dom'
import directionsBg from '@/assets/images/location/location-info-col-directions.png'
import phoneBg from '@/assets/images/location/location-info-col-phone.png'
import worshipBg from '@/assets/images/location/location-info-col-worship.png'
import { LOCATION_DATA, LOCATION_INFO_BANNER } from '@/data/location'
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

function LocationInfoColumn({ variant, bgImage, children }) {
  return (
    <div className={`location-info__column location-info__column--${variant}`}>
      <div
        className="location-info__column-bg"
        style={{ '--location-col-bg': `url(${bgImage})` }}
        aria-hidden="true"
      />
      <div className="location-info__column-inner">{children}</div>
    </div>
  )
}

function LocationInfo() {
  const banner = LOCATION_INFO_BANNER

  return (
    <section className="location-info" aria-label="교회 연락처 및 예배 안내">
      <div className="location-info__card">
        <div className="location-info__content">
          <LocationInfoColumn variant="directions" bgImage={directionsBg}>
            <div className="location-info__header">
              <span className="location-info__icon" aria-hidden="true">
                <IconPin />
              </span>
              <span className="location-info__label">{banner.directionsTitle}</span>
            </div>
            <div className="location-info__directions">
              <p className="location-info__address">{LOCATION_DATA.address}</p>
              <p className="location-info__church-name">{LOCATION_DATA.churchName}</p>
            </div>
          </LocationInfoColumn>

          <LocationInfoColumn variant="phone" bgImage={phoneBg}>
            <div className="location-info__phone-top">
              <div className="location-info__header">
                <span className="location-info__icon" aria-hidden="true">
                  <IconPhone />
                </span>
                <span className="location-info__label">{banner.phoneTitle}</span>
              </div>
              <a
                href={`tel:${LOCATION_DATA.phone}`}
                className="location-info__phone-number location-info__phone-number--compact"
              >
                {LOCATION_DATA.phone}
              </a>
            </div>
            <div className="location-info__phone-body">
              <a href={`tel:${LOCATION_DATA.phone}`} className="location-info__phone-number">
                {LOCATION_DATA.phone}
              </a>
              <p className="location-info__phone-desc">{banner.phoneDescription}</p>
              <div className="location-info__phone-hours">
                <p className="location-info__phone-hours-label">{banner.phoneHoursLabel}</p>
                <p className="location-info__phone-hours-value">{banner.phoneHours}</p>
              </div>
            </div>
          </LocationInfoColumn>

          <LocationInfoColumn variant="worship" bgImage={worshipBg}>
            <Link to={WORSHIP_PATH} className="location-info__worship-compact">
              <div className="location-info__header">
                <span className="location-info__icon" aria-hidden="true">
                  <IconClock />
                </span>
                <span className="location-info__label">{banner.worshipTitle}</span>
              </div>
              <span className="location-info__worship-compact-arrow" aria-hidden="true">
                &gt;
              </span>
            </Link>

            <div className="location-info__worship-full">
              <div className="location-info__header">
                <span className="location-info__icon" aria-hidden="true">
                  <IconClock />
                </span>
                <span className="location-info__label">{banner.worshipTitle}</span>
              </div>
              <div className="location-info__worship">
                <div className="location-info__worship-grid">
                  {banner.worshipColumns.map((column, columnIndex) => (
                    <ul key={columnIndex} className="location-info__worship-list">
                      {column.map((item) => (
                        <li key={item.id} className="location-info__worship-item">
                          <span className="location-info__worship-name">{item.name}</span>
                          <span className="location-info__worship-time-col">
                            <span className="location-info__worship-time">{item.time}</span>
                            {item.timeSub ? (
                              <span className="location-info__worship-time-sub">{item.timeSub}</span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ))}
                </div>
                <Link to={WORSHIP_PATH} className="location-info__worship-link">
                  {banner.worshipLinkLabel}
                  <span className="location-info__worship-link-arrow" aria-hidden="true">
                    {' '}
                    &gt;
                  </span>
                </Link>
              </div>
            </div>
          </LocationInfoColumn>
        </div>
      </div>
    </section>
  )
}

export default LocationInfo
