import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiChevronDown, FiPlay } from 'react-icons/fi'
import cellMeetingIcon from '@/assets/images/newFamily/cell-meeting-icon.png'
import KakaoRoughMap from '@/components/location/KakaoRoughMap'
import { FeatureIcon } from '@/components/newFamily/shared'
import {
  CELL_MEETING,
  CHURCH_FEATURE_CARDS,
  CONTACT_INFO,
  FAQ_ITEMS,
  FIRST_VISIT_STEPS,
  NEW_FAMILY_HERO,
  NEW_FAMILY_INTRO,
  NEW_FAMILY_VIDEO,
  getYouTubeThumbnail,
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

function PastorVideoModal({ isOpen, videoUrl, videoTitle, onClose }) {
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const autoplayUrl = videoUrl.includes('?') ? `${videoUrl}&autoplay=1` : `${videoUrl}?autoplay=1`

  return (
    <div className="nf-video-modal" role="presentation" onClick={onClose}>
      <div
        className="nf-video-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label={videoTitle}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="nf-video-modal__close" onClick={onClose}>
          닫기
        </button>
        <iframe
          src={autoplayUrl}
          title={videoTitle}
          className="nf-video-modal__iframe"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}

function NewFamilyGuide() {
  const pageRef = useRef(null)
  const [openFaqId, setOpenFaqId] = useState(null)
  const [isVideoOpen, setIsVideoOpen] = useState(false)

  const thumbnailUrl =
    NEW_FAMILY_VIDEO.thumbnail ?? getYouTubeThumbnail(NEW_FAMILY_VIDEO.videoId)

  const openVideo = useCallback(() => setIsVideoOpen(true), [])
  const closeVideo = useCallback(() => setIsVideoOpen(false), [])

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
        <div className="worship-template__image-slot worship-template__image-slot--hero">
          <img
            src={NEW_FAMILY_HERO.heroImage}
            alt="새가족을 환영합니다"
            className="worship-template__image"
            loading="eager"
          />
        </div>
      </div>

      <section className="nf-guide__intro worship-template__fade" aria-label="교회 소개">
        <div className="nf-guide__intro-panel">
          <img
            src={NEW_FAMILY_INTRO.panelImage}
            alt={NEW_FAMILY_INTRO.panelAlt}
            className="nf-guide__intro-panel-image"
            loading="lazy"
          />
        </div>

        <div className="nf-guide__intro-video">
          <button
            type="button"
            className="nf-video__card"
            onClick={openVideo}
            aria-label={NEW_FAMILY_VIDEO.playButtonLabel}
          >
            <img src={thumbnailUrl} alt="" className="nf-video__thumb" loading="lazy" />
            <span className="nf-video__overlay" aria-hidden="true" />
            <span className="nf-video__cta">
              <FiPlay aria-hidden="true" />
              {NEW_FAMILY_VIDEO.playButtonLabel}
            </span>
            <span className="nf-video__play" aria-hidden="true">
              <FiPlay />
            </span>
            <span className="nf-video__caption">
              <span className="nf-video__caption-line" aria-hidden="true" />
              <span className="nf-video__caption-text">
                <span className="nf-video__caption-name">{NEW_FAMILY_VIDEO.pastorName}</span>
                <span className="nf-video__caption-role">{NEW_FAMILY_VIDEO.pastorRole}</span>
              </span>
            </span>
          </button>
        </div>
      </section>

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

        <section className="nf-cell worship-template__fade" aria-label="셀모임 소개">
          <div className="nf-cell__banner">
            <div className="nf-cell__icon" aria-hidden="true">
              <img src={cellMeetingIcon} alt="" className="nf-cell__icon-img" />
            </div>
            <div className="nf-cell__text">
              <p className="nf-cell__eyebrow">{CELL_MEETING.eyebrow}</p>
              <h2 className="nf-cell__title">{CELL_MEETING.title}</h2>
              <p className="nf-cell__desc">{CELL_MEETING.description}</p>
            </div>
            <Link to={CELL_MEETING.buttonPath} className="nf-btn nf-btn--primary nf-cell__btn">
              {CELL_MEETING.buttonLabel}
              <span aria-hidden="true"> →</span>
            </Link>
          </div>
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
                <KakaoRoughMap />
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

      <PastorVideoModal
        isOpen={isVideoOpen}
        videoUrl={NEW_FAMILY_VIDEO.videoUrl}
        videoTitle={NEW_FAMILY_VIDEO.videoTitle}
        onClose={closeVideo}
      />
    </article>
  )
}

export default NewFamilyGuide
