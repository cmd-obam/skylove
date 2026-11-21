function PrayerParticipateButton({ participating, pending, onToggle }) {
  return (
    <button
      type="button"
      className={`prayer-button prayer-button--pray${participating ? ' prayer-button--praying' : ''}`}
      aria-pressed={participating}
      disabled={pending}
      onClick={onToggle}
    >
      <svg className="prayer-button__glyph" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
        {participating ? (
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.2 8.2 6.4 11.4 12.8 4.6"
          />
        ) : (
          <path fill="currentColor" d="M6.4 1.2h3.2V6.4H14.8v3.2H9.6v5.2H6.4V9.6H1.2V6.4h5.2V1.2z" />
        )}
      </svg>
      {pending ? '반영하는 중' : participating ? '함께 기도하고 있습니다' : '저도 기도합니다'}
    </button>
  )
}

export default PrayerParticipateButton
