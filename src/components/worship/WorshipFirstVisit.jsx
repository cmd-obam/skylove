import { Link } from 'react-router-dom'
import './WorshipFirstVisit.css'

function IconChurch() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3 8 7v2H5v12h14V9h-3V7l-4-4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 7v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function WorshipFirstVisit() {
  return (
    <section className="worship-first-visit" aria-label="처음 방문 안내">
      <span className="worship-first-visit__icon" aria-hidden="true">
        <IconChurch />
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
