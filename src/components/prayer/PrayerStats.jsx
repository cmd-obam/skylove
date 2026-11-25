import intercessionIcon from '@/assets/images/intercession/3.png'
import personalIcon from '@/assets/images/intercession/4.png'
import answeredIcon from '@/assets/images/intercession/5.png'
import { prayerListStat } from '@/services/prayer/present'

const STAT_ICONS = {
  together: intercessionIcon,
  praying: personalIcon,
  answered: answeredIcon,
}

function StatCard({ id, label, hint, value, active, onSelect }) {
  return (
    <button
      type="button"
      className={`prayer-stat prayer-stat--${id}${active ? ' prayer-stat--active' : ''}`}
      aria-pressed={active}
      onClick={() => onSelect(id)}
    >
      <span className="prayer-stat__icon">
        <img src={STAT_ICONS[id]} alt="" />
      </span>
      <span className="prayer-stat__value">{value}</span>
      <span className="prayer-stat__label">{label}</span>
      <span className="prayer-stat__hint">{hint}</span>
    </button>
  )
}

function PrayerStats({ stats, status, message, filters, onSelect }) {
  const active = prayerListStat(filters.status, false, filters.category)

  if (status === 'loading') {
    return <p className="prayer-status prayer-status--card">기도 통계를 불러오는 중입니다.</p>
  }

  if (status === 'error') {
    return <p className="prayer-status prayer-status--card prayer-status--error">{message}</p>
  }

  return (
    <div className="prayer-stats">
      <StatCard
        id="together"
        label="중보기도"
        hint="중보기도로 올린 제목"
        value={stats.togetherCount}
        active={active === 'together'}
        onSelect={onSelect}
      />
      <StatCard
        id="praying"
        label="개인기도"
        hint="개인기도로 올린 제목"
        value={stats.prayingCount}
        active={active === 'praying'}
        onSelect={onSelect}
      />
      <StatCard
        id="answered"
        label="기도 응답 완료"
        hint="응답으로 남은 기도"
        value={stats.answeredCount}
        active={active === 'answered'}
        onSelect={onSelect}
      />
    </div>
  )
}

export default PrayerStats
