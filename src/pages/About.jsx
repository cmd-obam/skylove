import { useLocation } from 'react-router-dom'
import './About.css'

const ABOUT_PAGES = {
  '/about': {
    title: '교회소개',
    subtitle: '하나님의 사랑으로 세워진 하늘사랑교회를 소개합니다',
  },
  '/about/history': {
    title: '교회역사',
    subtitle: '하늘사랑교회의 발자취를 소개합니다',
  },
}

function About() {
  const { pathname } = useLocation()
  const page = ABOUT_PAGES[pathname] ?? ABOUT_PAGES['/about']

  return (
    <>
      <header className="about-page__header">
        <h1 className="about-page__title">{page.title}</h1>
        <p className="about-page__subtitle">{page.subtitle}</p>
      </header>
      <div className="about-page__content">
        <p className="about-page__placeholder">콘텐츠 준비 중입니다.</p>
      </div>
    </>
  )
}

export default About
