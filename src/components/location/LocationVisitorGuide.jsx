import parkingImage from '@/assets/images/location/location-parking.png'
import { ACCESS_GUIDES } from '@/data/location'
import './LocationVisitorGuide.css'

function IconCar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 14h16l-1.5-5a2 2 0 0 0-1.9-1.4H7.4A2 2 0 0 0 5.5 9L4 14Zm2 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm12 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M4 14h16" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconBus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 5h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-1.2M6 5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1.2M6 5v14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="18" r="1.2" fill="currentColor" />
      <circle cx="16" cy="18" r="1.2" fill="currentColor" />
      <path d="M8 8h8M8 11h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconParking() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M10 8h2.2a2.2 2.2 0 1 1 0 4.4H10V8Zm0 0v8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LocationVisitorGuide() {
  const { car, bus } = ACCESS_GUIDES

  return (
    <section className="location-visitor" aria-label="교통 안내">
      <div className="location-visitor__grid">
        <article className="location-visitor__card location-visitor__card--car">
          <div className="location-visitor__card-header">
            <span className="location-visitor__icon" aria-hidden="true">
              <IconCar />
            </span>
            <h2 className="location-visitor__card-title">{car.title}</h2>
          </div>

          <div className="location-visitor__card-body location-visitor__card-body--car">
            <div className="location-visitor__car-text">
              <p className="location-visitor__subtitle">{car.subtitle}</p>
              <p className="location-visitor__description">{car.description}</p>
            </div>

            <figure className="location-visitor__image-wrap">
              <img
                src={parkingImage}
                alt="하늘사랑감리교회 주차장"
                className="location-visitor__image"
              />
            </figure>
          </div>

          <div className="location-visitor__card-footer">
            <span className="location-visitor__footer-icon" aria-hidden="true">
              <IconParking />
            </span>
            <p className="location-visitor__footer-text">{car.parkingNote}</p>
          </div>
        </article>

        <article className="location-visitor__card location-visitor__card--bus">
          <div className="location-visitor__card-header">
            <span className="location-visitor__icon" aria-hidden="true">
              <IconBus />
            </span>
            <h2 className="location-visitor__card-title">{bus.title}</h2>
          </div>

          <div className="location-visitor__table-wrap">
            <table className="location-visitor__table">
              <thead>
                <tr>
                  <th scope="col">방면</th>
                  <th scope="col">버스</th>
                  <th scope="col">하차 정류장 및 안내</th>
                </tr>
              </thead>
              <tbody>
                {bus.routes.map((route) => (
                  <tr key={route.id}>
                    <td className="location-visitor__table-direction">{route.direction}</td>
                    <td className="location-visitor__table-bus">{route.bus}</td>
                    <td className="location-visitor__table-info">
                      {route.stop} 교회까지 도보{' '}
                      <span className="location-visitor__highlight">{route.walk}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  )
}

export default LocationVisitorGuide
