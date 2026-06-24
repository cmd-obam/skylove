import WorshipHero from '@/components/worship/WorshipHero'
import WorshipScheduleTable from '@/components/worship/WorshipScheduleTable'
import WorshipFirstVisit from '@/components/worship/WorshipFirstVisit'
import './Worship.css'

function Worship() {
  return (
    <div className="worship-page">
      <WorshipHero />
      <WorshipScheduleTable />
      <WorshipFirstVisit />
    </div>
  )
}

export default Worship
