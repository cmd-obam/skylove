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

export function WordWorship() {
  return (
    <PlaceholderPage title="말씀&찬양" subtitle="말씀과 찬양 콘텐츠를 안내합니다" />
  )
}

export function Education() {
  return (
    <PlaceholderPage title="교육&양육" subtitle="교육과 양육 프로그램을 안내합니다" />
  )
}

export function Mission() {
  return (
    <PlaceholderPage title="전도&선교" subtitle="전도와 선교 사역을 소개합니다" />
  )
}

export function Fellowship() {
  return (
    <PlaceholderPage title="나눔&교제" subtitle="나눔과 교제 활동을 안내합니다" />
  )
}

export function SundaySchool() {
  return (
    <PlaceholderPage title="교회학교" subtitle="교회학교 프로그램을 안내합니다" />
  )
}

export function ChurchAlbum() {
  return (
    <PlaceholderPage title="교회앨범" subtitle="하늘사랑교회의 소중한 순간들을 나눕니다" />
  )
}

export function ChurchService() {
  return (
    <PlaceholderPage title="전도 및 섬김" subtitle="전도와 섬김의 현장을 소개합니다" />
  )
}

export function ChurchWorshipPraise() {
  return (
    <PlaceholderPage title="예배와 찬양" subtitle="예배와 찬양의 모습을 전합니다" />
  )
}

export function FacilityVr() {
  return (
    <PlaceholderPage
      title="시설둘러보기(VR)"
      subtitle="교회 시설을 가상으로 둘러보세요"
    />
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
