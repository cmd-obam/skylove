import { Link } from 'react-router-dom'
import { CELL_MEETING } from '@/data/newFamilyGuide'

function CellIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M10 30c0-6 4-11 9-12v-2a5 5 0 1 1 10 0v2c5 1 9 6 9 12"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 30h32v6a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4v-6Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M24 18c-2.2 1.8-3.5 4.2-3.8 7.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CellMeetingSection({
  title = CELL_MEETING.title,
  eyebrow = CELL_MEETING.eyebrow,
  description = CELL_MEETING.description,
  buttonLabel = CELL_MEETING.buttonLabel,
  buttonPath = CELL_MEETING.buttonPath,
}) {
  return (
    <section className="nf-section nf-cell nf-fade" aria-label="셀모임 소개">
      <div className="nf-cell__banner">
        <div className="nf-cell__banner-icon" aria-hidden="true">
          <CellIcon />
        </div>

        <div className="nf-cell__banner-text">
          <p className="nf-cell__eyebrow">{eyebrow}</p>
          <h2 className="nf-cell__title">{title}</h2>
          <p className="nf-cell__description">{description}</p>
        </div>

        <Link to={buttonPath} className="nf-button nf-button--primary nf-cell__banner-button">
          {buttonLabel}
          <span aria-hidden="true"> →</span>
        </Link>
      </div>
    </section>
  )
}

export default CellMeetingSection
