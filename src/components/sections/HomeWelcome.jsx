import { Link } from 'react-router-dom'
import { FiBookOpen, FiChevronRight, FiUser } from 'react-icons/fi'
import { HOME_WELCOME } from '@/data/home'
import HomeSectionHeader from '@/components/sections/HomeSectionHeader'
import './HomeSections.css'

const LINK_ICONS = {
  book: FiBookOpen,
  user: FiUser,
}

function HomeWelcome() {
  return (
    <section className="home-section home-welcome" aria-label="환영 안내">
      <div className="home-section__inner home-welcome__inner">
        <div className="home-welcome__content">
          <HomeSectionHeader
            eyebrow={HOME_WELCOME.eyebrow}
            title={HOME_WELCOME.title}
            titleLines={HOME_WELCOME.titleLines}
          />
          <p className="home-welcome__description">
            {HOME_WELCOME.descriptionLines?.map((line) => (
              <span key={line} className="home-welcome__description-line">
                {line}
              </span>
            ))}
          </p>
          <ul className="home-welcome__links">
            {HOME_WELCOME.links.map((link) => {
              const Icon = LINK_ICONS[link.icon] ?? FiBookOpen
              const content = (
                <>
                  <span className="home-welcome__link-main">
                    <span className="home-welcome__link-icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="home-welcome__link-label">{link.label}</span>
                  </span>
                  <span className="home-welcome__link-arrow" aria-hidden="true">
                    <FiChevronRight />
                  </span>
                </>
              )

              return (
                <li key={link.label} className="home-welcome__link-item">
                  {link.external ? (
                    <a
                      href={link.href}
                      className="home-welcome__link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {content}
                    </a>
                  ) : (
                    <Link to={link.href} className="home-welcome__link">
                      {content}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <div className="home-welcome__media">
          {HOME_WELCOME.image ? (
            <img
              src={HOME_WELCOME.image}
              alt={HOME_WELCOME.imageAlt}
              className="home-welcome__image"
            />
          ) : (
            <div className="home-placeholder home-placeholder--image" aria-hidden="true">
              <span>이미지 준비 중</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default HomeWelcome
