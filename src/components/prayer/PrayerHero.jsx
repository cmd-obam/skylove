function PrayerHero({ compact = false, title = '중보기도', children }) {
  return (
    <header className={`prayer-hero${compact ? ' prayer-hero--compact' : ''}`}>
      <div className="prayer-hero__glow" aria-hidden="true" />
      <div className="prayer-hero__cloud prayer-hero__cloud--left" aria-hidden="true" />
      <div className="prayer-hero__cloud prayer-hero__cloud--right" aria-hidden="true" />
      <div className="prayer-hero__inner">
        <div className="prayer-hero__icons" aria-hidden="true">
          <span className="prayer-hero__icon">
            <svg viewBox="0 0 24 24" width="22" height="22" focusable="false">
              <path
                fill="currentColor"
                d="M11 2h2v7h7v2h-7v11h-2V11H4V9h7V2z"
              />
            </svg>
          </span>
          <span className="prayer-hero__icon">
            <svg viewBox="0 0 24 24" width="22" height="22" focusable="false">
              <path
                fill="currentColor"
                d="M9.2 10.4c.2-2.2 1.6-3.6 3.4-3.6 1.3 0 2.2.6 2.7 1.6.4.8.5 1.7.3 2.6-.3 1.3-1.2 2.2-2.2 2.8-.4.2-.6.5-.6.9v.8h-2v-1.2c0-1.1.5-1.9 1.4-2.4.8-.4 1.3-.9 1.5-1.6.1-.4.1-.8-.1-1.2-.2-.4-.6-.6-1.1-.6-.8 0-1.4.7-1.5 1.9H9.2zm2.3 8.1h2v2h-2v-2zM4 14.5c.8-.9 1.8-1.5 3-1.5.4 0 .8.1 1.2.2-.3.6-.4 1.2-.4 1.8 0 .3 0 .6.1.9-1.4.2-2.5.8-3.3 1.6H4v-3zm16 0v3h-.6c-.8-.8-1.9-1.4-3.3-1.6.1-.3.1-.6.1-.9 0-.6-.1-1.2-.4-1.8.4-.1.8-.2 1.2-.2 1.2 0 2.2.6 3 1.5z"
              />
            </svg>
          </span>
        </div>
        <h1 className="prayer-hero__title">{title}</h1>
        {compact ? null : (
          <>
            <p className="prayer-hero__lead">기도는 사랑의 또 다른 표현입니다.</p>
            <p className="prayer-hero__text">
              서로의 기도 제목을 나누고 함께 기도하는 하늘사랑교회의 기도 공간입니다.
            </p>
          </>
        )}
        {children}
      </div>
    </header>
  )
}

export default PrayerHero
