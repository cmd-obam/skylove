import Breadcrumb from '@/components/Breadcrumb'
import { getPageMeta } from '@/data/pageMeta'
import worshipHeroImage from '@/assets/images/worship/worship-hero.png'
import './WorshipHero.css'

const WORSHIP_PATH = '/worship'

function WorshipHero() {
  const { title, subtitle } = getPageMeta(WORSHIP_PATH)

  return (
    <div className="worship-hero-wrap">
      <div className="worship-hero__breadcrumb">
        <Breadcrumb />
      </div>
      <section
        className="worship-hero"
        aria-label="예배 안내"
        style={{ '--worship-hero-bg': `url(${worshipHeroImage})` }}
      >
        <div className="worship-hero__content">
          <h1 className="worship-hero__title">{title}</h1>
          {subtitle && <p className="worship-hero__subtitle">{subtitle}</p>}
        </div>
      </section>
    </div>
  )
}

export default WorshipHero
