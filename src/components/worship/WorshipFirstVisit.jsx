import { Link } from 'react-router-dom'
import './WorshipFirstVisit.css'

const WORSHIP_FIRST_VISIT_ICON = '/images/worship-first-visit-icon.png'

function WorshipFirstVisit() {
  return (
    <section className="worship-first-visit" aria-label="처음 방문 안내">
      <span className="worship-first-visit__icon" aria-hidden="true">
        <img
          src={WORSHIP_FIRST_VISIT_ICON}
          alt=""
          className="worship-first-visit__icon-image"
          width={88}
          height={96}
          decoding="async"
        />
      </span>
      <div className="worship-first-visit__text">
        <h3 className="worship-first-visit__title">처음 방문하셨나요?</h3>
        <p className="worship-first-visit__desc">
          하늘사랑교회에 처음 오신 분들을 환영합니다.
        </p>
      </div>
      <Link to="/about/location" className="worship-first-visit__action">
        오시는 길 안내 &gt;
      </Link>
    </section>
  )
}

export default WorshipFirstVisit
