import heroImage from '@/assets/images/intercession/1.png'

function CrossIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M10.2 3h3.6v7.2H21v3.6h-7.2V21h-3.6v-7.2H3v-3.6h7.2V3z"
      />
    </svg>
  )
}

function HeroMark() {
  return (
    <div className="prayer-hero__art" aria-hidden="true">
      <span className="prayer-hero__halo" />
      <svg className="prayer-hero__mark" viewBox="0 0 240 240" focusable="false">
        <circle cx="120" cy="108" r="74" fill="rgba(255,255,255,0.16)" />
        <circle cx="120" cy="104" r="52" fill="rgba(255,255,255,0.22)" />
        <path
          d="M120 58v24M120 114v22M98 90h44"
          fill="none"
          stroke="#ffffff"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M93 154c2-20 12-32 22-32 6 0 10 4 12 12v48"
          fill="none"
          stroke="#ffffff"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M147 154c-2-20-12-32-22-32-6 0-10 4-12 12v48"
          fill="none"
          stroke="#ffffff"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M86 176c8 18 20 30 34 30s26-12 34-30"
          fill="none"
          stroke="#ffffff"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

function PrayerHero({ compact = false, title = '중보기도', children }) {
  return (
    <header
      className={`prayer-hero${compact ? ' prayer-hero--compact' : ' prayer-hero--photo'}`}
      style={compact ? undefined : { '--prayer-hero-image': `url(${heroImage})` }}
    >
      <div className="prayer-hero__sky" aria-hidden="true">
        <span className="prayer-hero__glow" />
        <span className="prayer-hero__ray" />
        <span className="prayer-hero__cloud prayer-hero__cloud--left" />
        <span className="prayer-hero__cloud prayer-hero__cloud--right" />
      </div>
      <div className="prayer-hero__inner">
        <div className="prayer-hero__copy">
          <p className="prayer-hero__eyebrow">
            <CrossIcon />
            하늘사랑교회
          </p>
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
        {compact ? null : <HeroMark />}
      </div>
    </header>
  )
}

export default PrayerHero
