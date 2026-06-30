import { useLocation } from 'react-router-dom'
import WorshipTemplate from '@/components/WorshipTemplate'
import { getWorshipGuideContent } from '@/data/worshipGuide'
import './About.css'

function WorshipGuideFallback() {
  return (
    <div className="about-page__content">
      <p className="about-page__placeholder">콘텐츠 준비 중입니다.</p>
    </div>
  )
}

function WorshipGuidePage() {
  const { pathname } = useLocation()
  const content = getWorshipGuideContent(pathname)

  if (!content) {
    return <WorshipGuideFallback />
  }

  return <WorshipTemplate key={pathname} {...content} />
}

export default WorshipGuidePage
