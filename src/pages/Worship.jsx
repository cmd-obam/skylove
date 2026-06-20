import WorshipImage from '@/components/worship/WorshipImage'
import WorshipSchedule from '@/components/worship/WorshipSchedule'
import './Worship.css'

function Worship() {
  return (
    <div className="worship-page">
      <header className="worship-page__header">
        <h1 className="worship-page__title">예배안내</h1>
        <p className="worship-page__subtitle">하나님을 만나는 은혜로운 시간</p>
      </header>

      <div className="worship-page__content">
        <WorshipImage />
        <WorshipSchedule />
      </div>
    </div>
  )
}

export default Worship
