import { Link } from 'react-router-dom'
import cellMeetingIcon from '@/assets/images/newFamily/cell-meeting-icon.png'
import { CELL_MEETING } from '@/data/newFamilyGuide'

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
          <img
            src={cellMeetingIcon}
            alt=""
            className="nf-cell__banner-icon-image"
          />
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
