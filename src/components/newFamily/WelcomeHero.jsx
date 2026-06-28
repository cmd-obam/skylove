import { NEW_FAMILY_HERO } from '@/data/newFamilyGuide'
import { PageHeading, PlaceholderImage } from '@/components/newFamily/shared'

function WelcomeHero({
  title = NEW_FAMILY_HERO.title,
  subtitle = NEW_FAMILY_HERO.subtitle,
  headlineLines = NEW_FAMILY_HERO.headlineLines,
  description = NEW_FAMILY_HERO.description,
  heroImage = NEW_FAMILY_HERO.heroImage,
}) {
  return (
    <section className="nf-section nf-hero nf-fade" aria-label="환영">
      <PageHeading title={title} subtitle={subtitle} />

      <div className="nf-hero__body">
        <div className="nf-hero__text">
          <p className="nf-hero__headline">
            {headlineLines.map((line) => (
              <span key={line} className="nf-hero__headline-line">
                {line}
              </span>
            ))}
          </p>
          <p className="nf-hero__description">{description}</p>
        </div>

        <div className="nf-hero__media">
          {heroImage ? (
            <img src={heroImage} alt="" className="nf-hero__image" loading="lazy" />
          ) : (
            <PlaceholderImage label="대표 이미지 영역" className="nf-hero__placeholder" minHeight={350} />
          )}
        </div>
      </div>
    </section>
  )
}

export default WelcomeHero
