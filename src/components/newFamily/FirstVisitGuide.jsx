import { Link } from 'react-router-dom'
import { FIRST_VISIT_STEPS } from '@/data/newFamilyGuide'
import { FeatureIcon, SectionHeading } from '@/components/newFamily/shared'

function FirstVisitGuide({ steps = FIRST_VISIT_STEPS }) {
  return (
    <section className="nf-section nf-first-visit nf-fade" aria-label="처음 방문 안내">
      <SectionHeading title="처음 방문하셨다면 이렇게 해보세요." />

      <ol className="nf-first-visit__grid">
        {steps.map((step, index) => (
          <li key={step.id} className="nf-first-visit__item">
            {index > 0 ? (
              <span className="nf-first-visit__arrow" aria-hidden="true">
                →
              </span>
            ) : null}
            <article className="nf-card nf-card--step">
              <span className="nf-first-visit__step-badge" aria-hidden="true">
                {index + 1}
              </span>
              <div className="nf-card__icon-wrap nf-card__icon-wrap--small">
                <FeatureIcon name={step.icon} />
              </div>
              <h3 className="nf-card__title">{step.title}</h3>
              <p className="nf-card__description">{step.description}</p>
              <Link to={step.buttonPath} className="nf-button nf-button--outline">
                {step.buttonLabel}
                <span aria-hidden="true"> →</span>
              </Link>
            </article>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default FirstVisitGuide
