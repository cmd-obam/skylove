import aboutIntroBg from '@/assets/images/about/about-intro-bg.png'
import pastorSignatureText from '@/assets/images/about/pastor-signature-text.png'
import PastorIntro from '@/components/about/PastorIntro'
import './About.css'

function About() {
  return (
    <div
      className="about-page"
      style={{ '--about-intro-bg': `url(${aboutIntroBg})` }}
    >
      <div className="about-page__intro">
        <h1 className="about-page__title">담임목사 인사</h1>

        <blockquote className="about-page__quote">
          <div className="about-page__quote-inner">
            <span className="about-page__quote-open" aria-hidden="true">
              “
            </span>
            <p className="about-page__quote-text">
              <span className="about-page__quote-line">
                우리 하늘사랑교회의 진짜 그리스도인이 되신것을
              </span>
              <span className="about-page__quote-line">
                가슴깊이{' '}
                <span className="about-page__quote-highlight">사랑</span>
                하는 마음으로 환영합니다
              </span>
            </p>
            <span className="about-page__quote-close" aria-hidden="true">
              ”
            </span>
          </div>
        </blockquote>

        <div className="about-page__scripture">
          <div className="about-page__scripture-ref-row">
            <span className="about-page__ref-line" aria-hidden="true" />
            <span className="about-page__ref-diamond" aria-hidden="true" />
            <p className="about-page__scripture-ref">마태복음 17:8</p>
            <span className="about-page__ref-diamond" aria-hidden="true" />
            <span className="about-page__ref-line" aria-hidden="true" />
          </div>
          <p className="about-page__scripture-text">
            제자들이 눈을 들고 보매 오직 예수 외에는 아무도 보이지 아니하더라
          </p>
        </div>
      </div>

      <div className="about-page__pastor-zone">
        <PastorIntro className="pastor-intro--about-page" />
      </div>

      <div className="about-page__signature" aria-hidden="true">
        <img
          src={pastorSignatureText}
          alt=""
          className="about-page__signature-image"
        />
      </div>
    </div>
  )
}

export default About
