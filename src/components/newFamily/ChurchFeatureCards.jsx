import { CHURCH_FEATURE_CARDS } from '@/data/newFamilyGuide'
import { FeatureIcon } from '@/components/newFamily/shared'
import './ChurchFeatureCards.css'

function FeatureLeaf() {
  return (
    <svg className="nf-feature-card__leaf" viewBox="0 0 72 96" fill="none" aria-hidden="true">
      <path
        d="M52 84c-2-18 2-36 12-50"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M56 68c-10-1-20 3-28 11M54 52c-8 2-16 8-22 16M50 36c-6 4-10 10-12 18"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M56 68c6-4 10-10 12-18M54 52c5-6 12-10 18-12M50 36c4-8 10-14 18-16"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChurchFeatureCards({ cards = CHURCH_FEATURE_CARDS }) {
  return (
    <section className="nf-section nf-features nf-fade" aria-label="교회 소개">
      <ul className="nf-features__grid">
        {cards.map((card) => (
          <li key={card.id} className="nf-features__item">
            <article className={`nf-feature-card nf-feature-card--${card.theme}`}>
              <div className="nf-feature-card__content">
                <div className="nf-feature-card__icon-wrap">
                  <FeatureIcon name={card.icon} />
                </div>
                <h3 className="nf-feature-card__title">{card.title}</h3>
                <p className="nf-feature-card__description">{card.description}</p>
              </div>
              <FeatureLeaf />
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ChurchFeatureCards
