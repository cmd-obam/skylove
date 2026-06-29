import heroBg from '@/assets/images/newFamily/new-family-hero-bg.png'
import { NEW_FAMILY_HERO } from '@/data/newFamilyGuide'
import { PageHeading } from '@/components/newFamily/shared'
import './WelcomeHero.css'

function WelcomeHero({
  title = NEW_FAMILY_HERO.title,
  subtitle = NEW_FAMILY_HERO.subtitle,
  welcomeLine = NEW_FAMILY_HERO.welcomeLine,
  headlineLine1 = NEW_FAMILY_HERO.headlineLine1,
  headlineHighlight = NEW_FAMILY_HERO.headlineHighlight,
  headlineLine2Prefix = NEW_FAMILY_HERO.headlineLine2Prefix,
  headlineLine2Suffix = NEW_FAMILY_HERO.headlineLine2Suffix,
  descriptionLines = NEW_FAMILY_HERO.descriptionLines,
  heroImage = NEW_FAMILY_HERO.heroImage,
}) {
  const useStyledBanner = !heroImage

  return (
    <section className="nf-section nf-hero nf-fade" aria-label="환영">
      <PageHeading title={title} subtitle={subtitle} />

      {useStyledBanner ? (
        <div
          className="nf-hero__banner nf-hero__banner--watercolor"
          style={{ '--nf-hero-bg': `url(${heroBg})` }}
        >
          <div className="nf-hero__banner-content">
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
        </div>
      ) : (
        <div className="nf-hero__body">
          <div className="nf-hero__text">
            <h2 className="nf-hero__headline">
              <span className="nf-hero__headline-line">{headlineLine1}</span>
              <span className="nf-hero__headline-line">
                {headlineHighlight}
                {headlineLine2Prefix}
                {headlineLine2Suffix}
              </span>
            </h2>
            <p className="nf-hero__description">
              {descriptionLines.join(' ')}
            </p>
          </div>
          <div className="nf-hero__media">
            <img src={heroImage} alt="" className="nf-hero__image" loading="lazy" />
          </div>
        </div>
      )}
    </section>
  )
}

export default WelcomeHero
