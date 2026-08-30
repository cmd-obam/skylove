import churchLogo from '@/assets/images/church-logo.png'
import { SUNDAY_BULLETIN_FIXED } from '@/data/sundayBulletinFixed'
import {
  createEmptySundayBulletinWeekly,
  formatSeasonWeekLines,
} from '@/utils/sundayBulletin'
import './SundayBulletin.css'

function OrderRow({ label, spaced, children, className = '' }) {
  return (
    <tr className={`sunday-bulletin__order-row ${className}`.trim()}>
      <th scope="row" className={`sunday-bulletin__order-label${spaced ? ' sunday-bulletin__order-label--spaced' : ''}`}>
        {label}
      </th>
      <td className="sunday-bulletin__order-value">{children}</td>
    </tr>
  )
}

function SundayBulletin({ weekly }) {
  const data = createEmptySundayBulletinWeekly(weekly)
  const fixed = SUNDAY_BULLETIN_FIXED
  const newsText = String(data.churchNews ?? '').trim()
  const seasonLines = formatSeasonWeekLines(data.seasonWeek)

  return (
    <div className="sunday-bulletin" aria-label="주일축복예배 주보">
      <header className="sunday-bulletin__header">
        <div className="sunday-bulletin__header-bar">
          <h2 className="sunday-bulletin__service-title">{fixed.serviceTitle}</h2>
          <p className="sunday-bulletin__service-time">{fixed.serviceTime}</p>
        </div>
        <p className="sunday-bulletin__moderator">
          <span className="sunday-bulletin__moderator-label">사회</span>
          <span className="sunday-bulletin__moderator-name">{fixed.moderator}</span>
        </p>
      </header>

      <section className="sunday-bulletin__upper">
        <aside className="sunday-bulletin__sidebar">
          <p className="sunday-bulletin__season">
            {seasonLines.length > 0
              ? seasonLines.map((line) => (
                  <span key={line} className="sunday-bulletin__season-line">
                    {line}
                  </span>
                ))
              : '\u00a0'}
          </p>
          <div className="sunday-bulletin__mission">
            <h3 className="sunday-bulletin__mission-title">{fixed.missionTitle}</h3>
            <p className="sunday-bulletin__mission-body">
              {fixed.missionLines.map((line) => (
                <span key={line} className="sunday-bulletin__mission-line">
                  {line}
                </span>
              ))}
            </p>
          </div>
        </aside>

        <div className="sunday-bulletin__order-wrap">
          <table className="sunday-bulletin__order">
            <tbody>
              <OrderRow label="경배와찬양">{fixed.orderFixed.worshipPraise}</OrderRow>
              <OrderRow label="예배의부름">{data.callToWorship || '\u00a0'}</OrderRow>
              <OrderRow label="오늘의기도">{data.prayer || '\u00a0'}</OrderRow>
              <OrderRow label="송영" spaced>
                {fixed.orderFixed.doxology}
              </OrderRow>
              <OrderRow label="찬양" spaced>
                {data.praise || '\u00a0'}
              </OrderRow>
              <OrderRow label="교독문" spaced>
                {data.responsiveReading || '\u00a0'}
              </OrderRow>
              <OrderRow label="봉헌찬양" spaced>
                {fixed.orderFixed.offeringPraise}
              </OrderRow>
              <OrderRow label="봉헌기도" spaced>
                {fixed.orderFixed.offeringPrayer}
              </OrderRow>
              <OrderRow label="은혜의통로" className="sunday-bulletin__order-row--grace">
                <div className="sunday-bulletin__grace">
                  <span className="sunday-bulletin__grace-song">{data.graceSong || '\u00a0'}</span>
                  <span className="sunday-bulletin__grace-choir">{fixed.graceChoir}</span>
                </div>
              </OrderRow>
              <OrderRow label="교제와소식">{data.fellowship || '\u00a0'}</OrderRow>
              <OrderRow label="성경봉독" spaced>
                {data.scripture || '\u00a0'}
              </OrderRow>
              <OrderRow label="임재의말씀">{data.sermon || '\u00a0'}</OrderRow>
            </tbody>
          </table>
        </div>
      </section>

      <section className="sunday-bulletin__news" aria-label="교회소식">
        <h3 className="sunday-bulletin__section-bar">교회소식</h3>
        <div className="sunday-bulletin__news-body">
          {newsText ? (
            <div className="sunday-bulletin__news-text">{newsText}</div>
          ) : (
            <div className="sunday-bulletin__news-placeholder" aria-hidden="true" />
          )}
        </div>
      </section>

      <section className="sunday-bulletin__footer">
        <div className="sunday-bulletin__footer-col sunday-bulletin__footer-col--serving">
          <h3 className="sunday-bulletin__section-bar">섬기는사람</h3>
          <ul className="sunday-bulletin__serving-list">
            {fixed.servingPeople.map((item) => (
              <li key={item.role} className="sunday-bulletin__serving-item">
                <span className="sunday-bulletin__serving-role">{item.role}</span>
                <span className="sunday-bulletin__serving-sep" aria-hidden="true">
                  :
                </span>
                <span className="sunday-bulletin__serving-name">{item.name}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="sunday-bulletin__footer-col sunday-bulletin__footer-col--missions">
          <h3 className="sunday-bulletin__section-bar">선교및후원</h3>
          <div className="sunday-bulletin__missions-inner">
            <div className="sunday-bulletin__missions-text">
              {fixed.missions.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div className="sunday-bulletin__brand">
              <img
                src={churchLogo}
                alt="하늘사랑교회 로고"
                className="sunday-bulletin__logo"
              />
              <div className="sunday-bulletin__brand-text">
                <p className="sunday-bulletin__denomination">{fixed.missions.denomination}</p>
                <p className="sunday-bulletin__church-name">{fixed.missions.churchName}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default SundayBulletin
