import welcomeBanner from '@/assets/images/newFamily/welcome-reason-banner.png'
import { WELCOME_REASON } from '@/data/newFamilyGuide'
import './WelcomeReasonCards.css'

function WelcomeReasonCards({
  eyebrow = WELCOME_REASON.eyebrow,
  title = WELCOME_REASON.title,
  description = WELCOME_REASON.description,
  items = WELCOME_REASON.items,
  bannerImage = welcomeBanner,
}) {
  return (
    <section className="nf-section nf-reasons nf-fade" aria-label="환영 대상">
      <div
        className="nf-reasons__banner"
        style={{ '--nf-reasons-banner-bg': `url(${bannerImage})` }}
      >
        <div className="nf-reasons__banner-inner">
          <div className="nf-reasons__banner-text">
            <p className="nf-reasons__eyebrow">{eyebrow}</p>
            <h2 className="nf-reasons__title">{title}</h2>
            <p className="nf-reasons__description">{description}</p>
          </div>

          <ul className="nf-reasons__grid">
            {items.map((item) => (
              <li key={item.id} className="nf-reasons__item">
                <img
                  src={item.icon}
                  alt=""
                  className="nf-reasons__icon"
                  loading="lazy"
                  aria-hidden="true"
                />
                <h3 className="nf-reasons__item-title">
                  {item.titleLines.map((line) => (
                    <span key={line} className="nf-reasons__item-title-line">
                      {line}
                    </span>
                  ))}
                </h3>
                <p className="nf-reasons__item-description">
                  {item.descriptionLines.map((line) => (
                    <span key={line} className="nf-reasons__item-description-line">
                      {line}
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export default WelcomeReasonCards
