import { NEW_FAMILY_HERO } from '@/data/newFamilyGuide'
import './WelcomeHero.css'

function WelcomeHero({
  welcomeLine = NEW_FAMILY_HERO.welcomeLine,
  headlineLine1 = NEW_FAMILY_HERO.headlineLine1,
  headlineHighlight = NEW_FAMILY_HERO.headlineHighlight,
  headlineLine2Prefix = NEW_FAMILY_HERO.headlineLine2Prefix,
  headlineLine2Suffix = NEW_FAMILY_HERO.headlineLine2Suffix,
  descriptionLines = NEW_FAMILY_HERO.descriptionLines,
}) {
  return (
    <section className="nf-hero nf-fade" aria-label="환영">
      <div className="nf-hero__content">
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
    </section>
  )
}

export default WelcomeHero
