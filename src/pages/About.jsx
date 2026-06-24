import { useLocation } from 'react-router-dom'
import PastorIntro from '@/components/about/PastorIntro'
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
  '/about/pastor': {
    title: '담임목사',
    subtitle: '교회를 섬기는 담임목사를 소개합니다',
  },
  '/about/servants': {
    title: '섬기는 사람들',
    subtitle: '하늘사랑교회를 함께 섬기는 사람들을 소개합니다',
  },
}

function About() {
  const { pathname } = useLocation()
  const page = ABOUT_PAGES[pathname] ?? ABOUT_PAGES['/about']
  const isPastorPage = pathname === '/about/pastor'

  return (
    <div className="about-page">
      <header className="about-page__header">
        <h1 className="about-page__title">{page.title}</h1>
        <p className="about-page__subtitle">{page.subtitle}</p>
      </header>
      <div className={`about-page__content${isPastorPage ? ' about-page__content--pastor' : ''}`}>
        {isPastorPage ? (
          <PastorIntro />
        ) : (
          <p className="about-page__placeholder">콘텐츠 준비 중입니다.</p>
        )}
      </div>
    </div>
  )
}

export default About
