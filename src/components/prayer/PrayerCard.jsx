import { Link } from 'react-router-dom'
import PrayerParticipateButton from '@/components/prayer/PrayerParticipateButton'
import { prayerDetailPath } from '@/data/prayerMenu'
import {
  formatPrayerDate,
  prayerAuthorLabel,
  prayerCategoryLabel,
  prayerStatusLabel,
  prayerVisibilityLabel,
} from '@/services/prayer/present'

function PrayerCard({ prayer, pending, onToggle, onDelete, showManage }) {
  return (
    <article className={`prayer-card${prayer.status === 'answered' ? ' prayer-card--answered' : ''}`}>
      <Link className="prayer-card__body" to={prayerDetailPath(prayer.id)}>
        <div className="prayer-card__tags">
          <span className="prayer-tag">{prayerCategoryLabel(prayer.category)}</span>
          <span className={`prayer-tag prayer-tag--${prayer.status}`}>
            {prayerStatusLabel(prayer.status)}
          </span>
          {prayer.visibility === 'private' ? (
            <span className="prayer-tag prayer-tag--private">{prayerVisibilityLabel('private')}</span>
          ) : null}
          {prayer.isOwner ? <span className="prayer-tag">내 기도 제목</span> : null}
        </div>
        <h2 className="prayer-card__title">{prayer.title}</h2>
        <p className="prayer-card__excerpt">{prayer.content}</p>
        <p className="prayer-card__meta">
          <span>{prayerAuthorLabel(prayer)}</span>
          <span>{formatPrayerDate(prayer.createdAt)}</span>
          <span>함께 기도 {prayer.participantCount}명</span>
        </p>
      </Link>
      <div className="prayer-card__actions">
        <PrayerParticipateButton
          participating={prayer.viewerParticipating}
          pending={pending}
          onToggle={() => onToggle(prayer)}
        />
        {showManage && prayer.canDelete ? (
          <button type="button" className="prayer-button prayer-button--danger" onClick={() => onDelete(prayer)}>
            삭제
          </button>
        ) : null}
      </div>
    </article>
  )
}

export default PrayerCard
