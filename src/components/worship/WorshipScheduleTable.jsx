import { WORSHIP_SCHEDULE } from '@/data/worship'
import './WorshipScheduleTable.css'

function WorshipScheduleTable() {
  return (
    <section className="worship-table" aria-labelledby="worship-table-title">
      <header className="worship-table__header">
        <h2 id="worship-table-title" className="worship-table__title">
          예배시간 안내
        </h2>
      </header>

      <div className="worship-table__wrap">
        <table className="worship-table__table">
          <thead>
            <tr>
              <th scope="col">예배명</th>
              <th scope="col">시간</th>
              <th scope="col">장소</th>
            </tr>
          </thead>
          <tbody>
            {WORSHIP_SCHEDULE.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.time}</td>
                <td>{item.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default WorshipScheduleTable
