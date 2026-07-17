import { NEW_FAMILY_HERO } from '@/data/newFamilyGuide'
import MobileBannerExpand from '@/components/common/MobileBannerExpand'
import './WelcomeHero.css'

function WelcomeHero({
  title = NEW_FAMILY_HERO.title,
  heroBackground = NEW_FAMILY_HERO.heroBackground,
  welcomeLine = NEW_FAMILY_HERO.welcomeLine,
  headlineLine1 = NEW_FAMILY_HERO.headlineLine1,
  headlineHighlight = NEW_FAMILY_HERO.headlineHighlight,
  headlineLine2Prefix = NEW_FAMILY_HERO.headlineLine2Prefix,
  headlineLine2Suffix = NEW_FAMILY_HERO.headlineLine2Suffix,
  descriptionLines = NEW_FAMILY_HERO.descriptionLines,
}) {
  const heroText = (
    <div
      className="nf-hero__content"
      data-scroll-lock-allow
      onClick={(event) => {
        if (event.currentTarget.closest('.mobile-image-lightbox__overlay')) {
          event.stopPropagation()
        }
      }}
    >
      <p className="nf-hero__welcome">
        <span className="nf-hero__welcome-text">{welcomeLine}</span>
      </p>

      <h2 className="nf-hero__main-title">
        <span className="nf-hero__main-line">{headlineLine1}</span>
        <span className="nf-hero__main-line nf-hero__main-line--second">
          <span className="nf-hero__highlight">{headlineHighlight}</span>
          {headlineLine2Prefix}
          {headlineLine2Suffix}
        </span>
      </h2>

      <p className="nf-hero__subcopy">
        {descriptionLines.map((line) => (
          <span key={line} className="nf-hero__subcopy-line">
            {line}
          </span>
        ))}
      </p>
    </div>
  )

  return (
    <MobileBannerExpand
      imageSrc={heroBackground}
      imageAlt="새가족 안내"
      className="nf-hero nf-hero--banner"
      style={{ '--nf-hero-bg': `url(${heroBackground})` }}
      lightboxLayout="overlay"
      lightboxBannerClassName="nf-hero--banner-lightbox"
      lightboxChildren={heroText}
    >
      <img
        src={heroBackground}
        alt=""
        className="nf-hero__bg-image"
        loading="eager"
        decoding="async"
        draggable={false}
      />
      {heroText}
    </MobileBannerExpand>
  )
}

export default WelcomeHero
