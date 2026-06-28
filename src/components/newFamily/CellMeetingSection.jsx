import { Link } from 'react-router-dom'
import { CELL_MEETING } from '@/data/newFamilyGuide'
import { PlaceholderImage } from '@/components/newFamily/shared'

function CellMeetingSection({
  title = CELL_MEETING.title,
  eyebrow = CELL_MEETING.eyebrow,
  description = CELL_MEETING.description,
  buttonLabel = CELL_MEETING.buttonLabel,
  buttonPath = CELL_MEETING.buttonPath,
  image = CELL_MEETING.image,
}) {
  return (
    <section className="nf-section nf-cell nf-fade" aria-label="셀모임 소개">
      <div className="nf-cell__inner">
        <div className="nf-cell__media">
          {image ? (
            <img src={image} alt="" className="nf-cell__image" loading="lazy" />
          ) : (
            <PlaceholderImage label="셀모임 이미지 영역" className="nf-cell__placeholder" />
          )}
        </div>

        <div className="nf-cell__panel">
          <p className="nf-cell__eyebrow">{eyebrow}</p>
          <h2 className="nf-cell__title">{title}</h2>
          <p className="nf-cell__description">{description}</p>
          <Link to={buttonPath} className="nf-button nf-button--primary">
            {buttonLabel}
            <span aria-hidden="true"> →</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

export default CellMeetingSection
