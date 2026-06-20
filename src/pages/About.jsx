import { useLocation } from 'react-router-dom'
import './About.css'

const ABOUT_PAGES = {
  '/about': {
    title: '교회소개',
    subtitle: '하나님의 사랑으로 세워진 하늘사랑감리교회를 소개합니다',
  },
  '/about/vision': {
    title: '교회비전',
    subtitle: '하나님 나라를 이루어 가는 교회',
  },
  '/about/pastor': {
    title: '담임목사소개',
    subtitle: '교회를 섬기는 담임목사를 소개합니다',
  },
  '/about/history': {
    title: '연혁',
    subtitle: '하늘사랑감리교회의 발자취',
  },
}

function About() {
  const { pathname } = useLocation()
  const page = ABOUT_PAGES[pathname] ?? ABOUT_PAGES['/about']

  return (
    <div className="about-page">
      <header className="about-page__header">
        <h1 className="about-page__title">{page.title}</h1>
        <p className="about-page__subtitle">{page.subtitle}</p>
      </header>
      <div className="about-page__content">
        <p className="about-page__placeholder">콘텐츠 준비 중입니다.</p>
      </div>
    </div>
  )
}

export default About
