import { FACILITIES_GUIDE } from '@/data/facilitiesGuide'
import './FacilitiesGuide.css'

function FacilityImage({ src, label }) {
  if (src) {
    return (
      <img src={src} alt={label} className="facilities__image" loading="lazy" />
    )
  }

  return (
    <div className="facilities__image-slot" role="img" aria-label={`${label} 이미지 영역`}>
      <span className="facilities__image-slot-text">이미지 영역</span>
    </div>
  )
}

function FacilitiesGuide({
  eyebrow = FACILITIES_GUIDE.eyebrow,
  title = FACILITIES_GUIDE.title,
  introLines = FACILITIES_GUIDE.introLines,
  heroImage = FACILITIES_GUIDE.heroImage,
  items = FACILITIES_GUIDE.items,
  footerMessage = FACILITIES_GUIDE.footerMessage,
}) {
  return (
    <article className="facilities">
      <header className="facilities__hero">
        <div className="facilities__hero-text">
          <p className="facilities__eyebrow">{eyebrow}</p>
          <h1 className="facilities__title">{title}</h1>
          <p className="facilities__intro">
            {introLines.map((line) => (
              <span key={line} className="facilities__intro-line">
                {line}
              </span>
            ))}
          </p>
        </div>
        <div className="facilities__hero-media">
          <FacilityImage src={heroImage} label="시설 안내 대표" />
        </div>
      </header>

      <div className="facilities__list">
        {items.map((item, index) => (
          <section
            key={item.id}
            className={`facilities__item${index % 2 === 1 ? ' facilities__item--reverse' : ''}`}
            aria-labelledby={`facility-${item.id}-title`}
          >
            <div className="facilities__item-media">
              <FacilityImage src={item.image} label={item.title} />
            </div>
            <div className="facilities__item-body">
              <div className="facilities__item-index" aria-hidden="true">
                <span className="facilities__item-line" />
                <span className="facilities__item-number">{item.number}</span>
              </div>
              <h2 id={`facility-${item.id}-title`} className="facilities__item-title">
                {item.title}
              </h2>
              <p className="facilities__item-description">
                {item.descriptionLines.map((line) => (
                  <span key={line} className="facilities__item-description-line">
                    {line}
                  </span>
                ))}
              </p>
            </div>
          </section>
        ))}
      </div>

      <footer className="facilities__footer">
        <p className="facilities__footer-message">{footerMessage}</p>
      </footer>
    </article>
  )
}

export default FacilitiesGuide
