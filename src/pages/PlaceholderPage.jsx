import './About.css'

function PlaceholderPage({ title, subtitle }) {
  return (
    <div className="about-page">
      <header className="about-page__header">
        <h1 className="about-page__title">{title}</h1>
        <p className="about-page__subtitle">{subtitle}</p>
      </header>
      <div className="about-page__content">
        <p className="about-page__placeholder">콘텐츠 준비 중입니다.</p>
      </div>
    </div>
  )
}

export function Facilities() {
  return (
    <PlaceholderPage title="시설안내" subtitle="교회 시설을 안내합니다" />
  )
}

export function Notice() {
  return (
    <PlaceholderPage title="공지사항" subtitle="교회 소식과 공지를 확인하세요" />
  )
}
