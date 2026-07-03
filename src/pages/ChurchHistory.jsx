import { useMemo, useState } from 'react'
import {
  CHURCH_HISTORY_FILTERS,
  CHURCH_HISTORY_INTRO,
  CHURCH_HISTORY_PERIODS,
  CHURCH_HISTORY_QUOTE,
} from '@/data/churchHistory'
import './ChurchHistory.css'

function ChurchHistoryIntro() {
  return (
    <section className="church-history-intro" aria-label="교회역사 소개">
      <div className="church-history-intro__icon" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M32 8L12 22v30h40V22L32 8z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M26 52V36h12v16" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M32 8v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M22 20h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className="church-history-intro__text">{CHURCH_HISTORY_INTRO.description}</p>
    </section>
  )
}

function ChurchHistoryFilters({ activeFilter, onChange }) {
  return (
    <div className="church-history-filters" role="tablist" aria-label="교회역사 구분">
      {CHURCH_HISTORY_FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          role="tab"
          aria-selected={activeFilter === filter.id}
          className={`church-history-filters__button${
            activeFilter === filter.id ? ' church-history-filters__button--active' : ''
          }`}
          onClick={() => onChange(filter.id)}
        >
          {filter.label}
        </button>
      ))}
    </div>
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
  return (
    <div className="church-history-photos">
      <h3 className="church-history-photos__title">대표 사진</h3>
      <ul className="church-history-photos__grid">
        {photos.map((photo) => (
          <li key={photo.id} className="church-history-photos__item">
            <div className="church-history-photos__placeholder" aria-hidden="true">
              <span>이미지 준비 중</span>
            </div>
            <p className="church-history-photos__caption">{photo.caption}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChurchHistoryPeriod({ period }) {
  return (
    <section className="church-history-period" aria-labelledby={`history-period-${period.id}`}>
      <div className="church-history-period__header">
        <span className="church-history-period__badge">{period.period}</span>
        <h2 className="church-history-period__title" id={`history-period-${period.id}`}>
          {period.title}
        </h2>
      </div>

      <ChurchHistoryEventTable events={period.events} />
      <ChurchHistoryPhotoGrid photos={period.photos} />
    </section>
  )
}

function ChurchHistoryQuote() {
  return (
    <section className="church-history-quote" aria-label="성경 구절">
      <blockquote className="church-history-quote__content">
        <p className="church-history-quote__text">&ldquo;{CHURCH_HISTORY_QUOTE.text}&rdquo;</p>
        <cite className="church-history-quote__reference">{CHURCH_HISTORY_QUOTE.reference}</cite>
      </blockquote>
    </section>
  )
}

function ChurchHistory() {
  const [activeFilter, setActiveFilter] = useState('all')

  const visiblePeriods = useMemo(() => {
    if (activeFilter === 'all') {
      return CHURCH_HISTORY_PERIODS
    }

    return CHURCH_HISTORY_PERIODS.filter((period) => period.category === activeFilter)
  }, [activeFilter])

  return (
    <div className="church-history-page">
      <ChurchHistoryIntro />
      <ChurchHistoryFilters activeFilter={activeFilter} onChange={setActiveFilter} />

      <div className="church-history-periods">
        {visiblePeriods.map((period) => (
          <ChurchHistoryPeriod key={period.id} period={period} />
        ))}
      </div>

      <ChurchHistoryQuote />
    </div>
  )
}

export default ChurchHistory
