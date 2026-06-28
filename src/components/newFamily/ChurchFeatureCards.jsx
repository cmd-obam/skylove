import { CHURCH_FEATURE_CARDS } from '@/data/newFamilyGuide'
import { FeatureIcon } from '@/components/newFamily/shared'

function ChurchFeatureCards({ cards = CHURCH_FEATURE_CARDS }) {
  return (
    <section className="nf-section nf-features nf-fade" aria-label="교회 소개">
      <ul className="nf-features__grid">
        {cards.map((card) => (
          <li key={card.id} className="nf-features__item">
            <article className="nf-card nf-card--feature">
              <div className="nf-card__icon-wrap">
                <FeatureIcon name={card.icon} />
              </div>
              <h3 className="nf-card__title">{card.title}</h3>
              <p className="nf-card__description">{card.description}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ChurchFeatureCards
