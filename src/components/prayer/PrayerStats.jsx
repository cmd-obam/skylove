import { prayerListStat } from '@/services/prayer/present'

function StatCard({ id, label, hint, value, active, onSelect }) {
  return (
    <button
      type="button"
      className={`prayer-stat${active ? ' prayer-stat--active' : ''}`}
      aria-pressed={active}
      onClick={() => onSelect(id)}
    >
      <span className="prayer-stat__value">{value}</span>
      <span className="prayer-stat__label">{label}</span>
      <span className="prayer-stat__hint">{hint}</span>
    </button>
  )
}

function PrayerStats({ stats, status, message, filters, onSelect }) {
  const active = prayerListStat(filters.status, filters.withParticipants)

  if (status === 'loading') {
    return <p className="prayer-status">기도 통계를 불러오는 중입니다.</p>
  }

  if (status === 'error') {
    return <p className="prayer-status prayer-status--error">{message}</p>
  }

  return (
    <div className="prayer-stats">
      <StatCard
        id="together"
        label="함께 기도 중인 제목"
        hint="한 명 이상이 참여한 기도"
        value={stats.togetherCount}
        active={active === 'together'}
        onSelect={onSelect}
      />
      <StatCard
        id="praying"
        label="현재 기도 중인 제목"
        hint="응답을 기다리는 기도"
        value={stats.prayingCount}
        active={active === 'praying'}
        onSelect={onSelect}
      />
      <StatCard
        id="answered"
        label="응답 완료된 기도 제목"
        hint="응답으로 표시된 기도"
        value={stats.answeredCount}
        active={active === 'answered'}
        onSelect={onSelect}
      />
    </div>
  )
}

export default PrayerStats
