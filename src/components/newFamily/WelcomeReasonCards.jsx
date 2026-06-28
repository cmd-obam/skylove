import { WELCOME_REASON } from '@/data/newFamilyGuide'
import { FeatureIcon, SectionHeading } from '@/components/newFamily/shared'

function WelcomeReasonCards({
  title = WELCOME_REASON.title,
  description = WELCOME_REASON.description,
  cards = WELCOME_REASON.cards,
}) {
  return (
    <section className="nf-section nf-reasons nf-fade" aria-label="환영 대상">
      <SectionHeading title={title} description={description} />

      <ul className="nf-reasons__grid">
        {cards.map((card) => (
          <li key={card.id} className="nf-reasons__item">
            <article className="nf-card nf-card--reason">
              <div className="nf-card__icon-wrap nf-card__icon-wrap--small">
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

export default WelcomeReasonCards
