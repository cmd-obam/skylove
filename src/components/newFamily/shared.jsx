import {
  FiBookOpen,
  FiChevronDown,
  FiCompass,
  FiHome,
  FiMapPin,
  FiMusic,
  FiPhone,
  FiPlay,
  FiUsers,
} from 'react-icons/fi'

export function PlaceholderImage({ label = '이미지 영역', className = '', minHeight }) {
  return (
    <div
      className={`nf-placeholder nf-placeholder--image ${className}`.trim()}
      role="img"
      aria-label={label}
      style={minHeight ? { minHeight } : undefined}
    >
      <span className="nf-placeholder__icon" aria-hidden="true">
        🖼
      </span>
      <span className="nf-placeholder__text">{label}</span>
    </div>
  )
}

export function PlaceholderVideo({ label = '영상 영역', thumbnail = null, className = '' }) {
  if (thumbnail) {
    return (
      <div className={`nf-placeholder nf-placeholder--video ${className}`.trim()}>
        <img src={thumbnail} alt={label} className="nf-placeholder__media" loading="lazy" />
        <span className="nf-placeholder__play" aria-hidden="true">
          <FiPlay />
        </span>
      </div>
    )
  }

  return (
    <div
      className={`nf-placeholder nf-placeholder--video ${className}`.trim()}
      role="img"
      aria-label={label}
    >
      <span className="nf-placeholder__play nf-placeholder__play--large" aria-hidden="true">
        <FiPlay />
      </span>
      <span className="nf-placeholder__text">{label}</span>
    </div>
  )
}

export function PlaceholderMap({ label = '지도 영역', mapImage = null, className = '' }) {
  if (mapImage) {
    return (
      <div className={`nf-placeholder nf-placeholder--map ${className}`.trim()}>
        <img src={mapImage} alt={label} className="nf-placeholder__media" loading="lazy" />
      </div>
    )
  }

  return (
    <div
      className={`nf-placeholder nf-placeholder--map ${className}`.trim()}
      role="img"
      aria-label={label}
    >
      <FiMapPin className="nf-placeholder__map-icon" aria-hidden="true" />
      <span className="nf-placeholder__text">{label}</span>
    </div>
  )
}

export function SectionHeading({ eyebrow, title, description, align = 'center' }) {
  return (
    <header className={`nf-section-heading nf-section-heading--${align}`}>
      {eyebrow && <p className="nf-section-heading__eyebrow">{eyebrow}</p>}
      <h2 className="nf-section-heading__title">{title}</h2>
      {description && <p className="nf-section-heading__description">{description}</p>}
    </header>
  )
}

export function PageHeading({ title, subtitle }) {
  return (
    <header className="nf-page-heading">
      <h1 className="nf-page-heading__title">{title}</h1>
      <p className="nf-page-heading__subtitle">{subtitle}</p>
      <div className="nf-page-heading__line" aria-hidden="true" />
    </header>
  )
}

const FEATURE_ICONS = {
  book: FiBookOpen,
  music: FiMusic,
  users: FiUsers,
  cross: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nf-icon-svg">
      <path d="M12 2v20M5 9h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  door: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nf-icon-svg">
      <path d="M4 4h10v16H4zM14 12h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  compass: FiCompass,
  path: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nf-icon-svg">
      <path d="M4 17c4-8 12-8 16 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
  home: FiHome,
  sprout: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nf-icon-svg">
      <path d="M12 22V12M12 12C12 6 6 4 4 4c0 4 2 8 8 8zM12 12c0-6 6-8 8-8 0 4-2 8-8 8z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  family: FiUsers,
  worship: FiUsers,
  handshake: () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nf-icon-svg">
      <path d="M4 12l4 4 4-6 4 6 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  community: FiUsers,
}

export function FeatureIcon({ name }) {
  const Icon = FEATURE_ICONS[name] ?? FiBookOpen
  const isFeather = ['book', 'music', 'users', 'compass', 'home'].includes(name)

  if (isFeather) {
    return <Icon aria-hidden="true" />
  }

  return <Icon />
}

export function AccordionChevron({ isOpen }) {
  return (
    <FiChevronDown
      className={`nf-accordion__chevron${isOpen ? ' nf-accordion__chevron--open' : ''}`}
      aria-hidden="true"
    />
  )
}

export function ContactIconPhone() {
  return <FiPhone aria-hidden="true" />
}

export function ContactIconMap() {
  return <FiMapPin aria-hidden="true" />
}
