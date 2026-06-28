import { Link } from 'react-router-dom'
import { CONTACT_INFO } from '@/data/newFamilyGuide'
import { ContactIconMap, ContactIconPhone, PlaceholderMap } from '@/components/newFamily/shared'

function ContactSection({
  phone = CONTACT_INFO.phone,
  address = CONTACT_INFO.address,
  worshipSummary = CONTACT_INFO.worshipSummary,
  mapImage = CONTACT_INFO.mapImage,
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
            <div className="nf-contact__row">
              <dt>
                <span className="nf-contact__label-dot" aria-hidden="true" />
                <span>예배시간</span>
              </dt>
              <dd>{worshipSummary}</dd>
            </div>
          </dl>
        </div>

        <div className="nf-contact__map">
          <PlaceholderMap label="지도 영역" mapImage={mapImage} />
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
