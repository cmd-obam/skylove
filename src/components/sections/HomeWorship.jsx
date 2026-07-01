import { Link } from 'react-router-dom'
import { FiBookOpen, FiSun, FiUsers } from 'react-icons/fi'
import { LuCross } from 'react-icons/lu'
import { HOME_WORSHIP_ITEMS } from '@/data/home'
import HomeSectionHeader from '@/components/sections/HomeSectionHeader'
import './HomeSections.css'

const WORSHIP_ICONS = {
  cross: LuCross,
  book: FiBookOpen,
  sun: FiSun,
  people: FiUsers,
}

function HomeWorship() {
  return (
    <section className="home-section home-worship" aria-label="예배 안내">
      <div className="home-section__inner">
        <HomeSectionHeader eyebrow="WORSHIP SERVICE" title="예배 안내" />

        <ul className="home-worship__grid">
          {HOME_WORSHIP_ITEMS.map((item) => {
            const Icon = WORSHIP_ICONS[item.icon] ?? LuCross

            return (
              <li key={item.id} className="home-worship__item">
                <div className="home-worship__card">
                  <span className="home-worship__icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <h3 className="home-worship__name">{item.name}</h3>
                  <p className="home-worship__time">{item.time}</p>
                  <p className="home-worship__description">{item.description}</p>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="home-section__actions">
          <Link to="/worship" className="home-section__button home-section__button--outline">
            예배 시간 더보기
          </Link>
        </div>
      </div>
    </section>
  )
}

export default HomeWorship
