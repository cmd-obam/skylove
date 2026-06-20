const ICONS = {
  sun: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  ),
  child: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="7" r="3" />
      <path d="M5 21v-1a5 5 0 0 1 10 0v1" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  dawn: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v3M4.5 10.5l2.1 2.1M19.5 10.5l-2.1 2.1" />
      <path d="M3 18h18" />
      <path d="M7 18a5 5 0 0 1 10 0" />
    </svg>
  ),
}

function WorshipCard({ name, time, location, icon }) {
  return (
    <article className="worship-card">
      <div className="worship-card__icon">{ICONS[icon]}</div>
      <div className="worship-card__body">
        <h3 className="worship-card__name">{name}</h3>
        <p className="worship-card__time">{time}</p>
        <p className="worship-card__location">{location}</p>
      </div>
    </article>
  )
}

export default WorshipCard
