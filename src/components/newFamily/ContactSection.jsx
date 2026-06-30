import { Link } from 'react-router-dom'
import KakaoRoughMap from '@/components/location/KakaoRoughMap'
import { CONTACT_INFO } from '@/data/newFamilyGuide'
import { ContactIconMap, ContactIconPhone } from '@/components/newFamily/shared'

function ContactSection({
  phone = CONTACT_INFO.phone,
  address = CONTACT_INFO.address,
  worshipSchedule = CONTACT_INFO.worshipSchedule,
  worshipSchedulePath = CONTACT_INFO.worshipSchedulePath,
  worshipGuidePath = CONTACT_INFO.worshipGuidePath,
  locationPath = CONTACT_INFO.locationPath,
}) {
  return (
    <section className="nf-section nf-contact nf-fade" aria-label="문의 및 오시는 길">
      <div className="nf-contact__grid">
        <div className="nf-contact__info">
          <h2 className="nf-contact__title">문의하기</h2>
          <dl className="nf-contact__list">
            <div className="nf-contact__row">
              <dt>
                <ContactIconPhone />
                <span>전화</span>
              </dt>
              <dd>
                <a href={`tel:${phone}`}>{phone}</a>
              </dd>
            </div>
            <div className="nf-contact__row">
              <dt>
                <ContactIconMap />
                <span>주소</span>
              </dt>
              <dd>{address}</dd>
            </div>
            <div className="nf-contact__row nf-contact__row--worship">
              <dt>
                <span className="nf-contact__label-dot" aria-hidden="true" />
                <span>예배시간</span>
              </dt>
              <dd className="nf-contact__worship">
                <Link to={worshipSchedulePath} className="nf-contact__worship-compact">
                  예배시간 안내
                  <span className="nf-contact__worship-compact-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
                <ul className="nf-contact__worship-list nf-contact__worship-full">
                  {worshipSchedule.map((item) => (
                    <li key={item.id}>
                      {item.name} {item.time}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </div>

        <div className="nf-contact__map">
          <KakaoRoughMap />
        </div>

        <div className="nf-contact__actions">
          <Link to={worshipGuidePath} className="nf-button nf-button--primary nf-button--block">
            예배안내 보기
            <span aria-hidden="true"> →</span>
          </Link>
          <Link to={locationPath} className="nf-button nf-button--outline nf-button--block">
            오시는 길 보기
            <span aria-hidden="true"> →</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

export default ContactSection
