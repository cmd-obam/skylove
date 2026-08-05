import { useCallback, useState } from 'react'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import churchHistoryIcon from '@/assets/images/about/church-history-icon.png'
import useIsMobile from '@/hooks/useIsMobile'
import MobileImageLightbox from '@/components/common/MobileImageLightbox'
import '@/components/common/MobileImageLightbox.css'
import {
  CHURCH_HISTORY_INTRO,
  CHURCH_HISTORY_PERIODS,
} from '@/data/churchHistory'
import './ChurchHistory.css'

const DEFAULT_OPEN_PERIOD_ID =
  CHURCH_HISTORY_PERIODS[CHURCH_HISTORY_PERIODS.length - 1]?.id ?? null

function formatPeriodLabel(period) {
  return String(period || '').replace(/~/g, ' ~ ')
}

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

  const openLightbox = useCallback(
    (photo) => {
      if (isMobile && photo.src) {
        setLightbox(photo)
      }
    },
    [isMobile],
  )

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

function ChurchHistoryAccordionItem({ period, isOpen, onToggle }) {
  const headingId = `history-period-heading-${period.id}`
  const panelId = `history-period-panel-${period.id}`
  const ChevronIcon = isOpen ? FiChevronUp : FiChevronDown

  return (
    <section
      id={`history-period-${period.id}`}
      className={`church-history-accordion__item${
        isOpen ? ' church-history-accordion__item--open' : ''
      }`}
      aria-labelledby={headingId}
    >
      <h2 className="church-history-accordion__heading" id={headingId}>
        <button
          type="button"
          className="church-history-accordion__trigger"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => onToggle(period.id)}
        >
          <span className="church-history-accordion__period">
            {formatPeriodLabel(period.period)}
          </span>
          <ChevronIcon className="church-history-accordion__icon" aria-hidden="true" />
        </button>
      </h2>

      <div
        id={panelId}
        className="church-history-accordion__panel"
        role="region"
        aria-labelledby={headingId}
        aria-hidden={!isOpen}
        inert={isOpen ? undefined : true}
      >
        <div className="church-history-accordion__panel-inner">
          <ChurchHistoryEventTable events={period.events} />
          {period.photos.length > 0 && <ChurchHistoryPhotoGrid photos={period.photos} />}
        </div>
      </div>
    </section>
  )
}

function ChurchHistory() {
  const [openPeriodIds, setOpenPeriodIds] = useState(() =>
    DEFAULT_OPEN_PERIOD_ID ? new Set([DEFAULT_OPEN_PERIOD_ID]) : new Set(),
  )

  const handleToggle = useCallback((periodId) => {
    setOpenPeriodIds((prev) => {
      const next = new Set(prev)
      if (next.has(periodId)) {
        next.delete(periodId)
      } else {
        next.add(periodId)
      }
      return next
    })
  }, [])

  return (
    <div className="church-history-page">
      <ChurchHistoryIntro />

      <div className="church-history-accordion" role="list">
        {CHURCH_HISTORY_PERIODS.map((period) => (
          <ChurchHistoryAccordionItem
            key={period.id}
            period={period}
            isOpen={openPeriodIds.has(period.id)}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  )
}

export default ChurchHistory
