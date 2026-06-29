import welcomeBanner from '@/assets/images/newFamily/welcome-reason-banner.png'
import { WELCOME_REASON } from '@/data/newFamilyGuide'
import './WelcomeReasonCards.css'

function WelcomeReasonCards({
  bannerImage = WELCOME_REASON.bannerImage ?? welcomeBanner,
  bannerAlt = WELCOME_REASON.bannerAlt,
}) {
  return (
    <section className="nf-section nf-reasons nf-fade" aria-label="환영 대상">
      <img src={bannerImage} alt={bannerAlt} className="nf-reasons__banner" loading="lazy" />
    </section>
  )
}

export default WelcomeReasonCards
