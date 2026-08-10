import './ServingPeople.css'

function preventPhotoContextMenu(event) {
  event.preventDefault()
}

function ServingPersonPhoto({ person, alt }) {
  const hasPhoto = Boolean(person.photoUrl)

  if (hasPhoto) {
    return (
      <div className="serving-person-card__photo-protect">
        <img
          src={person.photoUrl}
          alt={alt}
          className="serving-person-card__image"
          loading="lazy"
          draggable="false"
          onContextMenu={preventPhotoContextMenu}
          onDragStart={preventPhotoContextMenu}
        />
        <span
          className="serving-person-card__photo-shield"
          aria-hidden="true"
          onContextMenu={preventPhotoContextMenu}
        />
      </div>
    )
  }

  return (
    <div className="serving-person-card__placeholder" aria-hidden="true">
      <svg
        className="serving-person-card__placeholder-icon"
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="32" cy="24" r="12" fill="currentColor" opacity="0.35" />
        <path
          d="M8 56c0-13.255 10.745-24 24-24s24 10.745 24 24"
          fill="currentColor"
          opacity="0.28"
        />
      </svg>
      <span className="serving-person-card__placeholder-text">이미지 준비중</span>
    </div>
  )
}

function ServingPersonCard({ person }) {
  return (
    <article className="serving-person-card">
      <div className="serving-person-card__photo">
        <ServingPersonPhoto person={person} alt={`${person.name} ${person.role}`} />
      </div>
      <h3 className="serving-person-card__name">{person.name}</h3>
      <p className="serving-person-card__role">{person.role}</p>
    </article>
  )
}

function ServingPraiseCard({ teamTitle, person }) {
  const displayName = person.churchTitle
    ? `${person.name} ${person.churchTitle}`
    : person.name

  return (
    <article className="serving-person-card">
      <p className="serving-praise-card__team">{teamTitle}</p>
      <div className="serving-person-card__photo">
        <ServingPersonPhoto person={person} alt={displayName} />
      </div>
      <h3 className="serving-person-card__name">{displayName}</h3>
      <p className="serving-person-card__role">{person.role}</p>
    </article>
  )
}

export { ServingPraiseCard }
export default ServingPersonCard
