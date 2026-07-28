import './ServingPeople.css'

function ServingPersonCard({ person }) {
  const hasPhoto = Boolean(person.photoUrl)

  return (
    <article className="serving-person-card">
      <div className="serving-person-card__photo">
        {hasPhoto ? (
          <img
            src={person.photoUrl}
            alt={`${person.name} ${person.role}`}
            className="serving-person-card__image"
            loading="lazy"
          />
        ) : (
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
          </div>
        )}
      </div>
      <h3 className="serving-person-card__name">{person.name}</h3>
      <p className="serving-person-card__role">{person.role}</p>
    </article>
  )
}

export default ServingPersonCard
