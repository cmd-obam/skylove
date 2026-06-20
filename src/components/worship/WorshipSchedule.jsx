import { WORSHIP_SCHEDULE, OFFERING_ACCOUNT } from '@/data/worship'
import WorshipCard from '@/components/worship/WorshipCard'
import './WorshipSchedule.css'

function WorshipSchedule() {
  return (
    <div className="worship-schedule">
      <header className="worship-schedule__header">
        <p className="worship-schedule__eyebrow">Worship Schedule</p>
        <h2 className="worship-schedule__title">예배 시간 안내</h2>
      </header>

      <div className="worship-schedule__list">
        {WORSHIP_SCHEDULE.map((item, index) => (
          <div key={item.id}>
            <WorshipCard {...item} />
            {index < WORSHIP_SCHEDULE.length - 1 && (
              <hr className="worship-schedule__divider" />
            )}
          </div>
        ))}
      </div>

      <aside className="worship-schedule__offering">
        <p className="worship-schedule__offering-label">헌금 계좌</p>
        <p className="worship-schedule__offering-bank">{OFFERING_ACCOUNT.bank}</p>
        <p className="worship-schedule__offering-number">{OFFERING_ACCOUNT.number}</p>
        <p className="worship-schedule__offering-holder">{OFFERING_ACCOUNT.holder}</p>
      </aside>
    </div>
  )
}

export default WorshipSchedule
