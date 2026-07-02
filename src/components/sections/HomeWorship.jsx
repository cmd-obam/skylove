import { Link } from 'react-router-dom'
import { FiArrowRight, FiBookOpen, FiSun, FiUsers } from 'react-icons/fi'
import { HOME_WORSHIP_ITEMS } from '@/data/home'
import HomeSectionHeader from '@/components/sections/HomeSectionHeader'
import './HomeSections.css'

const WORSHIP_ICONS = {
  book: FiBookOpen,
  sun: FiSun,
  people: FiUsers,
}

function getWorshipMeta(item) {
  switch (item.id) {
    case 'sunday-blessing':
      return { label: '주일 오전', time: '11:00' }
    case 'sunday-praise':
      return { label: '주일 오후', time: '1:20' }
    case 'wednesday':
      return { label: '수요일 오후', time: '7:30' }
    case 'dawn-prayer':
      return { label: '화 - 토 오전', time: '5:30' }
    default:
      return { label: item.time, time: item.time }
  }
}

function HomeWorship() {
  return (
    <section className="home-section home-worship" aria-label="예배 안내">
      <div className="home-section__inner">
        <HomeSectionHeader eyebrow="WORSHIP SERVICE" title="예배 안내" />

        <ul className="home-worship__list">
          {HOME_WORSHIP_ITEMS.map((item, index) => {
            const Icon = WORSHIP_ICONS[item.icon] ?? FiBookOpen
            const meta = getWorshipMeta(item)
            const isCrossIcon = item.icon === 'cross'

            return (
              <li key={item.id} className="home-worship__item">
                <div className="home-worship__entry">
                  {isCrossIcon ? (
                    <span className="home-worship__icon home-worship__icon--cross" aria-hidden="true">
                      <span className="home-worship__cross-vertical" />
                      <span className="home-worship__cross-horizontal" />
                    </span>
                  ) : (
                    <span className="home-worship__icon" aria-hidden="true">
                      <Icon />
                    </span>
                  )}
                  <h3 className="home-worship__name">{item.name}</h3>
                  <p className="home-worship__meta">{meta.label}</p>
                  <p className="home-worship__time">{meta.time}</p>
                  <p className="home-worship__description">{item.description}</p>
                </div>
                {index < HOME_WORSHIP_ITEMS.length - 1 && (
                  <span className="home-worship__divider" aria-hidden="true" />
                )}
              </li>
            )
          })}
        </ul>

        <div className="home-section__actions">
          <Link to="/worship" className="home-section__button home-section__button--outline">
            예배 시간 더보기
            <span className="home-section__button-arrow" aria-hidden="true">
              <FiArrowRight />
            </span>
          </Link>
        </div>
      </div>
    </section>
  )
}

export default HomeWorship
