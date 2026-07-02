import { Fragment, useId } from 'react'
import { Link } from 'react-router-dom'
import { FIRST_VISIT_STEPS } from '@/data/newFamilyGuide'

function FirstVisitArrow() {
  const markerId = useId()

  return (
    <svg
      className="nf-first-visit__arrow"
      viewBox="0 0 28 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 8 8"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M0.75 1.5 L6.25 4 L0.75 6.5"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      </defs>
      <line
        x1="1"
        y1="6"
        x2="22"
        y2="6"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        markerEnd={`url(#${markerId})`}
      />
    </svg>
  )
}

function FirstVisitGuide({ steps = FIRST_VISIT_STEPS }) {
  return (
    <section className="nf-section nf-first-visit nf-fade" aria-label="처음 방문 안내">
      <h2 className="nf-first-visit__title">처음 방문하셨다면 이렇게 해보세요</h2>

      <ol className="nf-first-visit__grid">
        {steps.map((step, index) => {
          const descriptionLines =
            step.descriptionLines ?? (step.description ? [step.description] : [])

          return (
            <Fragment key={step.id}>
              <li className="nf-first-visit__card-item">
                <article className="nf-first-visit__card">
                  {index < steps.length - 1 ? <FirstVisitArrow /> : null}
                  <div className="nf-first-visit__card-head">
                    <span className="nf-first-visit__step-badge" aria-hidden="true">
                      {index + 1}
                    </span>
                    <h3 className="nf-first-visit__card-title">{step.title}</h3>
                  </div>
                  <div className="nf-first-visit__card-body">
                    <p className="nf-first-visit__card-description">
                      {descriptionLines.map((line) => (
                        <span key={line} className="nf-first-visit__card-description-line">
                          {line}
                        </span>
                      ))}
                    </p>
                    <Link to={step.buttonPath} className="nf-first-visit__button">
                      {step.buttonLabel}
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              </li>
              {index < steps.length - 1 ? (
                <li className="nf-first-visit__arrow-item" aria-hidden="true" />
              ) : null}
            </Fragment>
          )
        })}
      </ol>
    </section>
  )
}

export default FirstVisitGuide
