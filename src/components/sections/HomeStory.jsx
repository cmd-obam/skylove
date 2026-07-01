import { Link } from 'react-router-dom'
import { HOME_NEWS_ITEMS, HOME_STORY_CARDS } from '@/data/home'
import HomeSectionHeader from '@/components/sections/HomeSectionHeader'
import './HomeSections.css'

function StoryCard({ card }) {
  const content = (
    <>
      <div className="home-story__card-media">
        {card.image ? (
          <img src={card.image} alt={card.title} className="home-story__card-image" />
        ) : (
          <div className="home-placeholder home-placeholder--card">
            <span>{card.comingSoon ? '콘텐츠 준비 중' : '이미지 준비 중'}</span>
          </div>
        )}
      </div>
      <div className="home-story__card-body">
        <h3 className="home-story__card-title">{card.title}</h3>
        <p className="home-story__card-description">{card.description}</p>
      </div>
    </>
  )

  if (card.href && !card.comingSoon) {
    return (
      <Link to={card.href} className="home-story__card home-story__card--link">
        {content}
      </Link>
    )
  }

  return <article className="home-story__card">{content}</article>
}

function HomeStory() {
  return (
    <section className="home-section home-story" aria-label="교회 이야기">
      <div className="home-section__inner">
        <HomeSectionHeader
          eyebrow="OUR STORY"
          title="교회 이야기"
          action={
            <Link to="/church-news" className="home-section__more">
              더보기
            </Link>
          }
        />

        <div className="home-story__layout">
          <ul className="home-story__cards">
            {HOME_STORY_CARDS.map((card) => (
              <li key={card.id} className="home-story__cards-item">
                <StoryCard card={card} />
              </li>
            ))}
          </ul>

          <div className="home-story__news">
            <h3 className="home-story__news-title">최근 소식</h3>
            <ul className="home-story__news-list">
              {HOME_NEWS_ITEMS.map((item) => (
                <li key={item.id} className="home-story__news-item">
                  {item.href ? (
                    <Link to={item.href} className="home-story__news-link">
                      <span className="home-story__news-text">{item.title}</span>
                      <span className="home-story__news-date">{item.date}</span>
                    </Link>
                  ) : (
                    <div className="home-story__news-link">
                      <span className="home-story__news-text">{item.title}</span>
                      <span className="home-story__news-date">{item.date}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HomeStory
