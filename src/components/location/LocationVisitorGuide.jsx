import heroImage02 from '@/assets/images/hero/hero02.jpg'
import { VISITOR_GUIDES } from '@/data/location'
import './LocationVisitorGuide.css'

const GUIDE_IMAGES = {
  parking: heroImage02,
  entrance: heroImage02,
  transit: heroImage02,
}

function IconCar() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 14h16l-1.5-5a2 2 0 0 0-1.9-1.4H7.4A2 2 0 0 0 5.5 9L4 14Zm2 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm12 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M4 14h16" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function IconDoor() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 4h10v16H7V4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M11 12h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function IconBus() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 5h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-1.2M6 5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1.2M6 5v14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="18" r="1.2" fill="currentColor" />
      <circle cx="16" cy="18" r="1.2" fill="currentColor" />
      <path d="M8 8h8M8 11h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

const GUIDE_ICONS = {
  parking: IconCar,
  entrance: IconDoor,
  transit: IconBus,
}

function LocationVisitorGuide() {
  return (
    <section className="location-visitor" aria-labelledby="location-visitor-title">
      <header className="location-visitor__header">
        <h2 id="location-visitor-title" className="location-visitor__title">
          처음 방문하시나요?
        </h2>
        <p className="location-visitor__subtitle">
          처음 오시는 분들도 편안하게 예배에 참여하실 수 있도록 안내해 드립니다.
        </p>
      </header>

      <ul className="location-visitor__grid">
        {VISITOR_GUIDES.map((guide) => {
          const Icon = GUIDE_ICONS[guide.id]

          return (
            <li
              key={guide.id}
              className={`location-visitor__card${
                guide.routes ? ' location-visitor__card--transit' : ''
              }`}
            >
              <div className="location-visitor__card-top">
                <span className="location-visitor__icon" aria-hidden="true">
                  <Icon />
                </span>
                <h3 className="location-visitor__card-title">{guide.title}</h3>
                {guide.routes ? (
                  <ul className="location-visitor__routes">
                    {guide.routes.map((route) => (
                      <li key={route.bus} className="location-visitor__route">
                        <strong className="location-visitor__route-bus">{route.bus}</strong>
                        <span className="location-visitor__route-stop">{route.stop}</span>
                        <span className="location-visitor__route-walk">{route.walk}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="location-visitor__card-desc">{guide.description}</p>
                )}
              </div>
              <figure className="location-visitor__card-image-wrap">
                <img
                  src={GUIDE_IMAGES[guide.id]}
                  alt={`${guide.title} 이미지`}
                  className="location-visitor__card-image"
                />
              </figure>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default LocationVisitorGuide
