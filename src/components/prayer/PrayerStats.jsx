import { prayerListStat } from '@/services/prayer/present'

function StatIcon({ kind }) {
  if (kind === 'together') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm8 0a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zM3.5 19v-1.2c0-2.2 2.2-3.8 5.2-3.8.7 0 1.4.1 2 .3-.6.8-1 1.7-1 2.7V19H3.5zm7.5 0v-2c0-2.4 2.4-4.2 5.4-4.2 3 0 5.6 1.8 5.6 4.2V19H11z"
        />
      </svg>
    )
  }

  if (kind === 'answered') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 3.2 13.6 8h5l-4 3.1 1.5 4.8L12 13.1 7.9 15.9 9.4 11.1 5.4 8h5L12 3.2zM6 18.2h12v1.8H6v-1.8z"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2.2c.7 1.5.3 2.8-.4 3.7 1 .4 1.8 1.4 1.8 2.6 0 .5-.1.9-.3 1.3 1.6.6 2.7 2.1 2.7 3.8v.5c0 .3-.3.6-.6.6H8.8c-.3 0-.6-.3-.6-.6v-.5c0-1.7 1.1-3.2 2.7-3.8-.2-.4-.3-.8-.3-1.3 0-1.2.8-2.2 1.8-2.6-.7-.9-1.1-2.2-.4-3.7zM7.2 17.4h9.6v1.7H7.2v-1.7zm1.1 2.6h7.4V22H8.3v-2z"
      />
    </svg>
  )
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
        <StatIcon kind={id} />
      </span>
      <span className="prayer-stat__value">{value}</span>
      <span className="prayer-stat__label">{label}</span>
      <span className="prayer-stat__hint">{hint}</span>
    </button>
  )
}

function PrayerStats({ stats, status, message, filters, onSelect }) {
  const active = prayerListStat(filters.status, filters.withParticipants)

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
        label="함께 기도 중인 제목"
        hint="한 명 이상이 함께하는 기도"
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
