import Breadcrumb from '@/components/Breadcrumb'
import MobileBannerExpand from '@/components/common/MobileBannerExpand'
import { getPageMeta } from '@/data/pageMeta'
import worshipHeroImage from '@/assets/images/worship/worship-hero.png'
import './WorshipHero.css'

const WORSHIP_PATH = '/worship'

function WorshipHero() {
  const { title, subtitle, subtitleLines } = getPageMeta(WORSHIP_PATH)
  const lines = subtitleLines?.length
    ? subtitleLines
    : subtitle
      ? [subtitle]
      : []

  return (
    <div className="worship-hero-wrap">
      <header className="worship-hero__page-header">
        <div className="worship-hero__page-heading">
          <h1 className="sub-layout__title">{title}</h1>
        </div>
        <Breadcrumb />
      </header>
      <MobileBannerExpand
        imageSrc={worshipHeroImage}
        imageAlt="예배 안내"
        className="worship-hero"
        showHeadlineOverlay={false}
        style={{ '--worship-hero-bg': `url(${worshipHeroImage})` }}
      >
        <div className="worship-hero__content">
          {lines.length > 0 ? (
            <p className="worship-hero__subtitle">
              {lines.map((line) => (
                <span key={line} className="worship-hero__subtitle-line">
                  {line}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </MobileBannerExpand>
    </div>
  )
}

export default WorshipHero
