function PrayerParticipateButton({ participating, pending, onToggle }) {
  return (
    <button
      type="button"
      className={`prayer-button prayer-button--pray${participating ? ' prayer-button--praying' : ''}`}
      aria-pressed={participating}
      disabled={pending}
      onClick={onToggle}
    >
      {pending ? '반영하는 중' : participating ? '함께 기도하고 있습니다' : '저도 기도합니다'}
    </button>
  )
}

export default PrayerParticipateButton
