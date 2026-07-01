import { Link } from 'react-router-dom'
import KakaoRoughMap from '@/components/location/KakaoRoughMap'
import { HOME_LOCATION } from '@/data/home'
import HomeSectionHeader from '@/components/sections/HomeSectionHeader'
import './HomeSections.css'

function HomeLocation() {
  return (
    <section className="home-section home-location" aria-label="찾아오시는 길">
      <div className="home-section__inner">
        <HomeSectionHeader eyebrow={HOME_LOCATION.eyebrow} title={HOME_LOCATION.title} />

        <div className="home-location__layout">
          <div className="home-location__info">
            <dl className="home-location__details">
              <div className="home-location__detail">
                <dt>주소</dt>
                <dd>{HOME_LOCATION.address}</dd>
              </div>
              <div className="home-location__detail">
                <dt>전화</dt>
                <dd>
                  <a href={`tel:${HOME_LOCATION.phone.replace(/-/g, '')}`}>
                    {HOME_LOCATION.phone}
                  </a>
                </dd>
              </div>
            </dl>

            <Link
              to={HOME_LOCATION.cta.href}
              className="home-section__button home-section__button--outline"
            >
              {HOME_LOCATION.cta.label}
            </Link>
          </div>

          <div className="home-location__map">
            <KakaoRoughMap />
          </div>
        </div>
      </div>
    </section>
  )
}

export default HomeLocation
