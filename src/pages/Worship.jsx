import WorshipImage from '@/components/worship/WorshipImage'
import WorshipSchedule from '@/components/worship/WorshipSchedule'
import './Worship.css'

function Worship() {
  return (
    <div className="worship-page__content">
      <WorshipImage />
      <WorshipSchedule />
    </div>
  )
}

export default Worship
