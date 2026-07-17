import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HOME_RECENT_NEWS_LIMIT,
  HOME_RECENT_NEWS_SOURCES,
  HOME_STORY_CARDS,
} from '@/data/home'
import HomeSectionHeader from '@/components/sections/HomeSectionHeader'
import { fetchLatestBoardPosts } from '@/services/board/posts'
import { formatBoardDate } from '@/utils/formatBoardDate'
import { getPostAuthor } from '@/utils/getPostAuthor'
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

function mapPostsForSource(source, posts) {
  return posts.map((post) => ({
    id: `${source.id}-${post.id}`,
    title: post.title,
    author: getPostAuthor(post),
    date: formatBoardDate(post.createdAt || post.date),
    href: source.detailPath(post.id),
  }))
}

function HomeStory() {
  const [activeTabId, setActiveTabId] = useState(HOME_RECENT_NEWS_SOURCES[0].id)
  const [postsByTab, setPostsByTab] = useState({})
  const [loadingTabId, setLoadingTabId] = useState(HOME_RECENT_NEWS_SOURCES[0].id)
  const postsCacheRef = useRef({})

  useEffect(() => {
    let isMounted = true
    const source = HOME_RECENT_NEWS_SOURCES.find((item) => item.id === activeTabId)

    if (!source) {
      return undefined
    }

    if (postsCacheRef.current[activeTabId]) {
      setPostsByTab((prev) =>
        prev[activeTabId] ? prev : { ...prev, [activeTabId]: postsCacheRef.current[activeTabId] },
      )
      setLoadingTabId(null)
      return undefined
    }

    setLoadingTabId(activeTabId)

    async function loadTabPosts() {
      const result = await fetchLatestBoardPosts(source.postType, HOME_RECENT_NEWS_LIMIT)
      const items = result.success ? mapPostsForSource(source, result.posts ?? []) : []

      postsCacheRef.current[activeTabId] = items

      if (isMounted) {
        setPostsByTab((prev) => ({ ...prev, [activeTabId]: items }))
        setLoadingTabId(null)
      }
    }

    loadTabPosts()

    return () => {
      isMounted = false
    }
  }, [activeTabId])

  const activeSource =
    HOME_RECENT_NEWS_SOURCES.find((item) => item.id === activeTabId) ??
    HOME_RECENT_NEWS_SOURCES[0]
  const activePosts = postsByTab[activeTabId] ?? []
  const isLoading = loadingTabId === activeTabId

  return (
    <section className="home-section home-story" aria-label="교회 이야기">
      <div className="home-section__inner">
        <HomeSectionHeader
          eyebrow="OUR STORY"
          title="교회 이야기"
          action={
            <Link to={activeSource.listPath} className="home-section__more">
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
            <div
              className="home-story__news-tabs"
              role="tablist"
              aria-label="게시판 카테고리"
            >
              {HOME_RECENT_NEWS_SOURCES.map((source) => {
                const isActive = source.id === activeTabId

                return (
                  <button
                    key={source.id}
                    type="button"
                    role="tab"
                    id={`home-story-tab-${source.id}`}
                    aria-selected={isActive}
                    aria-controls="home-story-news-panel"
                    className={`home-story__news-tab${
                      isActive ? ' home-story__news-tab--active' : ''
                    }`}
                    onClick={() => setActiveTabId(source.id)}
                  >
                    {source.categoryLabel}
                  </button>
                )
              })}
            </div>

            <ul
              id="home-story-news-panel"
              className="home-story__news-list"
              role="tabpanel"
              aria-labelledby={`home-story-tab-${activeTabId}`}
            >
              {isLoading ? (
                Array.from({ length: HOME_RECENT_NEWS_LIMIT }, (_, index) => (
                  <li key={`loading-${index}`} className="home-story__news-item">
                    <div className="home-story__news-link">
                      <span className="home-story__news-text">불러오는 중...</span>
                      <span className="home-story__news-meta">
                        <span className="home-story__news-author"> </span>
                        <span className="home-story__news-date"> </span>
                      </span>
                    </div>
                  </li>
                ))
              ) : activePosts.length > 0 ? (
                activePosts.map((item) => (
                  <li key={item.id} className="home-story__news-item">
                    <Link to={item.href} className="home-story__news-link">
                      <span className="home-story__news-text">{item.title}</span>
                      <span className="home-story__news-meta">
                        <span className="home-story__news-author">{item.author}</span>
                        <span className="home-story__news-date">{item.date}</span>
                      </span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="home-story__news-item home-story__news-item--empty">
                  <div className="home-story__news-link">
                    <span className="home-story__news-text">등록된 게시글이 없습니다.</span>
                    <span className="home-story__news-meta">
                      <Link to={activeSource.listPath} className="home-story__news-empty-link">
                        게시판 보기
                      </Link>
                    </span>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HomeStory
