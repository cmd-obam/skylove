import { useEffect, useRef } from 'react'
import pageBg from '@/assets/images/newFamily/new-family-page-bg.png'
import WelcomeHero from '@/components/newFamily/WelcomeHero'
import ChurchIntroVideo from '@/components/newFamily/ChurchIntroVideo'
import ChurchFeatureCards from '@/components/newFamily/ChurchFeatureCards'
import WelcomeReasonCards from '@/components/newFamily/WelcomeReasonCards'
import FirstVisitGuide from '@/components/newFamily/FirstVisitGuide'
import CellMeetingSection from '@/components/newFamily/CellMeetingSection'
import FAQAccordion from '@/components/newFamily/FAQAccordion'
import ContactSection from '@/components/newFamily/ContactSection'
import '@/components/newFamily/NewFamilyGuide.css'

function NewFamilyGuide() {
  const pageRef = useRef(null)

  useEffect(() => {
    const root = pageRef.current

    if (!root) {
      return undefined
    }

    const targets = root.querySelectorAll('.nf-fade')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('nf-fade--visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -32px 0px' },
    )

    targets.forEach((target) => observer.observe(target))

    return () => observer.disconnect()
  }, [])

  return (
    <div
      className="new-family-page"
      ref={pageRef}
      style={{ '--nf-page-bg': `url(${pageBg})` }}
    >
      <section className="new-family-page__landing" aria-label="새가족 환영">
        <div className="new-family-page__landing-inner">
          <WelcomeHero />
          <ChurchIntroVideo />
        </div>
      </section>

      <div className="new-family-page__body">
        <ChurchFeatureCards />
        <WelcomeReasonCards />
        <FirstVisitGuide />
        <CellMeetingSection />

        <div className="nf-footer-grid">
          <FAQAccordion />
          <ContactSection />
        </div>
      </div>
    </div>
  )
}

export default NewFamilyGuide
