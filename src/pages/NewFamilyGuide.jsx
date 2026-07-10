import { Fragment, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiChevronDown } from 'react-icons/fi'
import KakaoRoughMap from '@/components/location/KakaoRoughMap'
import ChurchIntroVideo from '@/components/newFamily/ChurchIntroVideo'
import { FeatureIcon } from '@/components/newFamily/shared'
import WelcomeHero from '@/components/newFamily/WelcomeHero'
import {
  CHURCH_FEATURE_CARDS,
  CONTACT_INFO,
  FAQ_ITEMS,
  FIRST_VISIT_STEPS,
  NEW_FAMILY_HERO,
} from '@/data/newFamilyGuide'
import '@/components/WorshipTemplate.css'
import '@/components/newFamily/NewFamilyGuide.css'

function FirstVisitArrow() {
  const markerId = useId()

  return (
    <svg className="nf-visit__arrow" viewBox="0 0 28 12" fill="none" aria-hidden="true">
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

function FeatureLeaf() {
  return (
    <svg className="nf-features__leaf" viewBox="0 0 72 96" fill="none" aria-hidden="true">
      <path d="M52 84c-2-18 2-36 12-50" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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

function NewFamilyGuide() {
  const pageRef = useRef(null)
  const [openFaqId, setOpenFaqId] = useState(null)

  useEffect(() => {
    const root = pageRef.current

    if (!root) {
      return undefined
    }

    const targets = root.querySelectorAll('.worship-template__fade')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('worship-template__fade--visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )

    targets.forEach((target) => {
      target.classList.remove('worship-template__fade--visible')
      observer.observe(target)

      const rect = target.getBoundingClientRect()
      const isAlreadyVisible = rect.top < window.innerHeight * 0.92 && rect.bottom > 0

      if (isAlreadyVisible) {
        target.classList.add('worship-template__fade--visible')
        observer.unobserve(target)
      }
    })

    return () => observer.disconnect()
  }, [])

  return (
    <article className="worship-template nf-guide" ref={pageRef}>
      <header className="worship-template__header worship-template__fade">
        <h2 className="worship-template__title">{NEW_FAMILY_HERO.title}</h2>
        <p className="worship-template__subtitle">{NEW_FAMILY_HERO.subtitle}</p>
        <div className="worship-template__title-line" aria-hidden="true" />
      </header>

      <div className="worship-template__hero worship-template__fade">
        <WelcomeHero />
      </div>

      <ChurchIntroVideo className="nf-guide__intro-block worship-template__fade" />

      <div className="nf-guide__body">
        <section className="nf-features worship-template__fade" aria-label="교회 핵심 가치">
          <ul className="nf-features__grid">
            {CHURCH_FEATURE_CARDS.map((card) => (
              <li key={card.id}>
                <article className={`nf-features__card nf-features__card--${card.theme}`}>
                  <div className="nf-features__card-body">
                    <div className="nf-features__icon">
                      <FeatureIcon name={card.icon} />
                    </div>
                    <h3 className="nf-features__card-title">{card.title}</h3>
                    <p className="nf-features__card-desc">{card.description}</p>
                  </div>
                  <FeatureLeaf />
                </article>
              </li>
            ))}
          </ul>
        </section>

        <section className="nf-visit worship-template__fade" aria-label="처음 방문 안내">
          <h2 className="nf-visit__heading">처음 방문하셨다면 이렇게 해보세요</h2>
          <ol className="nf-visit__grid">
            {FIRST_VISIT_STEPS.map((step, index) => {
              const lines = step.descriptionLines ?? (step.description ? [step.description] : [])

              return (
                <Fragment key={step.id}>
                  <li className="nf-visit__item">
                    <article className="nf-visit__card">
                      {index < FIRST_VISIT_STEPS.length - 1 ? <FirstVisitArrow /> : null}
                      <div className="nf-visit__card-head">
                        <span className="nf-visit__badge" aria-hidden="true">
                          {index + 1}
                        </span>
                        <h3 className="nf-visit__card-title">{step.title}</h3>
                      </div>
                      <div className="nf-visit__card-body">
                        <p className="nf-visit__card-desc">
                          {lines.map((line) => (
                            <span key={line} className="nf-visit__card-desc-line">
                              {line}
                            </span>
                          ))}
                        </p>
                        <Link to={step.buttonPath} className="nf-visit__btn">
                          {step.buttonLabel}
                          <span aria-hidden="true"> →</span>
                        </Link>
                      </div>
                    </article>
                  </li>
                  {index < FIRST_VISIT_STEPS.length - 1 ? (
                    <li className="nf-visit__arrow-slot" aria-hidden="true" />
                  ) : null}
                </Fragment>
              )
            })}
          </ol>
        </section>

        <section className="nf-bottom worship-template__fade" aria-label="문의 및 안내">
          <div className="nf-bottom__grid">
            <div className="nf-faq">
              <h2 className="nf-section-title">자주 묻는 질문</h2>
              <p className="nf-section-desc">처음 방문하시는 분들이 자주 묻는 질문입니다.</p>
              <ul className="nf-faq__list">
                {FAQ_ITEMS.map((item) => {
                  const isOpen = openFaqId === item.id

                  return (
                    <li key={item.id} className="nf-faq__item">
                      <button
                        type="button"
                        className="nf-faq__trigger"
                        aria-expanded={isOpen}
                        onClick={() => setOpenFaqId((current) => (current === item.id ? null : item.id))}
                      >
                        <span>{item.question}</span>
                        <FiChevronDown
                          className={`nf-faq__chevron${isOpen ? ' nf-faq__chevron--open' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                      <div
                        className={`nf-faq__panel${isOpen ? ' nf-faq__panel--open' : ''}`}
                        aria-hidden={!isOpen}
                      >
                        <p className="nf-faq__answer">{item.answer}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="nf-contact">
              <h2 className="nf-section-title">문의하기</h2>
              <dl className="nf-contact__list">
                <div className="nf-contact__row">
                  <dt>전화</dt>
                  <dd>
                    <a href={`tel:${CONTACT_INFO.phone}`}>{CONTACT_INFO.phone}</a>
                  </dd>
                </div>
                <div className="nf-contact__row">
                  <dt>주소</dt>
                  <dd>{CONTACT_INFO.address}</dd>
                </div>
                <div className="nf-contact__row">
                  <dt>예배시간</dt>
                  <dd>
                    <ul className="nf-contact__schedule">
                      {CONTACT_INFO.worshipSchedule.map((item) => (
                        <li key={item.id}>
                          {item.name} {item.time}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>

              <div className="nf-map">
                <KakaoRoughMap hideInfoHeader />
              </div>

              <div className="nf-contact__actions">
                <Link to={CONTACT_INFO.worshipGuidePath} className="nf-btn nf-btn--primary">
                  예배안내 보기
                  <span aria-hidden="true"> →</span>
                </Link>
                <Link to={CONTACT_INFO.locationPath} className="nf-btn nf-btn--outline">
                  오시는 길 보기
                  <span aria-hidden="true"> →</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </article>
  )
}

export default NewFamilyGuide
