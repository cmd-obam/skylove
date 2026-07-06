import pastorPhoto from '@/assets/images/about/pastor.png'
import pastorSignatureText from '@/assets/images/about/pastor-signature-text.png'
import { ABOUT_INTRO } from '@/data/aboutIntro'
import './PastorIntro.css'

function PastorIntro({ className = '', showSignature = false }) {
  return (
    <div className={`pastor-intro${className ? ` ${className}` : ''}`}>
      <figure className="pastor-intro__photo-wrap">
        <img
          src={pastorPhoto}
          alt="하늘사랑교회 담임목사"
          className="pastor-intro__photo"
        />
      </figure>

      <div className="pastor-intro__content">
        <h2 className="pastor-intro__headline">
          <span className="pastor-intro__headline-line">{ABOUT_INTRO.headline.line1}</span>
          <span className="pastor-intro__headline-line pastor-intro__headline-line--second">
            <span className="pastor-intro__headline-prefix">{ABOUT_INTRO.headline.line2Prefix}</span>
            <span className="pastor-intro__headline-accent">{ABOUT_INTRO.headline.line2Accent}</span>
          </span>
        </h2>

        <div className="pastor-intro__body">
          {ABOUT_INTRO.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        {showSignature && (
          <div className="pastor-intro__signature" aria-hidden="true">
            <img
              src={pastorSignatureText}
              alt=""
              className="pastor-intro__signature-image"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default PastorIntro
