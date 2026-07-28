import { useCallback, useState } from 'react'
import churchHistoryIcon from '@/assets/images/about/church-history-icon.png'
import useIsMobile from '@/hooks/useIsMobile'
import MobileImageLightbox from '@/components/common/MobileImageLightbox'
import '@/components/common/MobileImageLightbox.css'
import {
  CHURCH_HISTORY_INTRO,
  CHURCH_HISTORY_PERIODS,
} from '@/data/churchHistory'
import './ChurchHistory.css'

function ChurchHistoryIntro() {
  return (
    <section className="church-history-intro" aria-label="교회역사 소개">
      <div className="church-history-intro__icon" aria-hidden="true">
        <img src={churchHistoryIcon} alt="" className="church-history-intro__icon-image" />
      </div>
      <p className="church-history-intro__text">
        {CHURCH_HISTORY_INTRO.lines.map((line, index) => (
          <span key={line}>
            {index > 0 && <br />}
            {line}
          </span>
        ))}
      </p>
    </section>
  )
}

function ChurchHistoryNav({ activePeriodId, onNavigate }) {
  return (
    <nav className="church-history-filters" aria-label="교회역사 연도 이동">
      {CHURCH_HISTORY_PERIODS.map((period) => (
        <button
          key={period.id}
          type="button"
          className={`church-history-filters__button${
            activePeriodId === period.id ? ' church-history-filters__button--active' : ''
          }`}
          aria-current={activePeriodId === period.id ? 'true' : undefined}
          onClick={() => onNavigate(period.id)}
        >
          {period.period}
        </button>
      ))}
    </nav>
  )
}

function ChurchHistoryEventTable({ events }) {
  return (
    <div className="church-history-table-wrap">
      <table className="church-history-table">
        <thead>
          <tr>
            <th scope="col">날짜</th>
            <th scope="col">행사명</th>
            <th scope="col">내용</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={`${event.date}-${event.name}`}>
              <td>{event.date}</td>
              <td>{event.name}</td>
              <td>{event.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChurchHistoryPhotoGrid({ photos }) {
  const isMobile = useIsMobile()
  const [lightbox, setLightbox] = useState(null)

  const openLightbox = useCallback((photo) => {
    if (isMobile && photo.src) {
      setLightbox(photo)
    }
  }, [isMobile])

  const closeLightbox = useCallback(() => {
    setLightbox(null)
  }, [])

  return (
    <div className="church-history-photos">
      <h3 className="church-history-photos__title">대표 사진</h3>
      <ul className="church-history-photos__grid">
        {photos.map((photo) => (
          <li key={photo.id} className="church-history-photos__item">
            {photo.src ? (
              isMobile ? (
                <button
                  type="button"
                  className="church-history-photos__trigger"
                  onClick={() => openLightbox(photo)}
                  aria-label={`${photo.caption} 원본 보기`}
                >
                  <img
                    src={photo.src}
                    alt={photo.caption}
                    className="church-history-photos__image"
                    loading="lazy"
                  />
                </button>
              ) : (
                <img
                  src={photo.src}
                  alt={photo.caption}
                  className="church-history-photos__image"
                  loading="lazy"
                />
              )
            ) : (
              <div className="church-history-photos__placeholder" aria-hidden="true">
                <span>이미지 준비 중</span>
              </div>
            )}
            <p className="church-history-photos__caption">{photo.caption}</p>
          </li>
        ))}
      </ul>

      {lightbox ? (
        <MobileImageLightbox
          imageSrc={lightbox.src}
          imageAlt={lightbox.caption}
          onClose={closeLightbox}
        />
      ) : null}
    </div>
  )
}

function ChurchHistoryPeriod({ period }) {
  const headingId = `history-period-heading-${period.id}`

  return (
    <section
      id={`history-period-${period.id}`}
      className="church-history-period"
      aria-labelledby={headingId}
    >
      <header className="church-history-period__header">
        <h2 className="church-history-period__badge" id={headingId}>
          {period.period}
        </h2>
      </header>

      <ChurchHistoryEventTable events={period.events} />
      {period.photos.length > 0 && <ChurchHistoryPhotoGrid photos={period.photos} />}
    </section>
  )
}

function ChurchHistory() {
  const [activePeriodId, setActivePeriodId] = useState(null)

  const scrollToPeriod = useCallback((periodId) => {
    const target = document.getElementById(`history-period-${periodId}`)
    if (!target) {
      return
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActivePeriodId(periodId)
  }, [])

  return (
    <div className="church-history-page">
      <ChurchHistoryIntro />
      <ChurchHistoryNav activePeriodId={activePeriodId} onNavigate={scrollToPeriod} />

      <div className="church-history-periods">
        {CHURCH_HISTORY_PERIODS.map((period) => (
          <ChurchHistoryPeriod key={period.id} period={period} />
        ))}
      </div>
    </div>
  )
}

export default ChurchHistory
