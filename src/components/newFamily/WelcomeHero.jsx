import { NEW_FAMILY_HERO } from '@/data/newFamilyGuide'
import MobileBannerExpand from '@/components/common/MobileBannerExpand'
import './WelcomeHero.css'

function WelcomeHero({
  heroBackground = NEW_FAMILY_HERO.heroBackground,
  welcomeLine = NEW_FAMILY_HERO.welcomeLine,
  headlineLine1 = NEW_FAMILY_HERO.headlineLine1,
  headlineHighlight = NEW_FAMILY_HERO.headlineHighlight,
  headlineLine2Prefix = NEW_FAMILY_HERO.headlineLine2Prefix,
  headlineLine2Suffix = NEW_FAMILY_HERO.headlineLine2Suffix,
  descriptionLines = NEW_FAMILY_HERO.descriptionLines,
}) {
  return (
    <MobileBannerExpand
      imageSrc={heroBackground}
      imageAlt="새가족 안내"
      className="nf-hero nf-hero--banner worship-template__intro--typography-classic"
      style={{ '--nf-hero-bg': `url(${heroBackground})` }}
    >
      <img
        src={heroBackground}
        alt=""
        className="nf-hero__bg-image"
        loading="eager"
        decoding="async"
        draggable={false}
      />

      <div className="nf-hero__content">
        <div className="worship-template__intro-text">
          <p className="nf-hero__welcome nf-hero__welcome--preview">
            <span className="nf-hero__welcome-text">{welcomeLine}</span>
          </p>

          <p className="worship-template__headline nf-hero__headline">
            <span className="worship-template__headline-line nf-hero__main-line">{headlineLine1}</span>
            <span className="worship-template__headline-line nf-hero__main-line nf-hero__main-line--second">
              <span className="worship-template__headline-accent nf-hero__highlight">
                {headlineHighlight}
              </span>
              {headlineLine2Prefix}
              {headlineLine2Suffix}
            </span>
          </p>

          <div className="worship-template__intro-divider nf-hero__lightbox-only" aria-hidden="true" />

          <p className="worship-template__intro-title nf-hero__lightbox-only">{welcomeLine}</p>

          <p className="worship-template__description nf-hero__description">
            {descriptionLines.map((line) => (
              <span key={line} className="worship-template__description-line nf-hero__subcopy-line">
                {line}
              </span>
            ))}
          </p>
        </div>
      </div>
    </MobileBannerExpand>
  )
}

export default WelcomeHero
