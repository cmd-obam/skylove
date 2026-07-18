import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaChurch } from 'react-icons/fa'
import { FiImage, FiMusic } from 'react-icons/fi'
import { HiOutlineSpeakerphone } from 'react-icons/hi'
import { HOME_STORY, HOME_STORY_SOURCES } from '@/data/home'
import HomeSectionHeader from '@/components/sections/HomeSectionHeader'
import { fetchHomeStoryPosts } from '@/services/board/posts'
import { getAlbumThumbnailSrc } from '@/utils/albumThumbnail'
import { formatPostRegistrationDate } from '@/utils/formatBoardDate'
import './HomeSections.css'

const BADGE_ICONS = {
  sunday_sermon: FaChurch,
  el_shaddai_choir: FiMusic,
  church_news: HiOutlineSpeakerphone,
  album: FiImage,
}

function getPostExcerpt(content, maxLength = 72) {
  if (!content) {
    return ''
  }

  const text = String(content).replace(/\s+/g, ' ').trim()

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength).trim()}…`
}

function formatStoryDate(post, dateSuffix) {
  const dateLabel = formatPostRegistrationDate(post)

  if (!dateLabel) {
    return ''
  }

  return dateSuffix ? `${dateLabel} ${dateSuffix}` : dateLabel
}

function mapStoryCard(source, post) {
  if (!post) {
    return {
      id: source.id,
      featured: source.featured,
      badgeLabel: source.badgeLabel,
      listPath: source.listPath,
      empty: true,
    }
  }

  return {
    id: source.id,
    featured: source.featured,
    badgeLabel: source.badgeLabel,
    listPath: source.listPath,
    empty: false,
    title: post.title || '제목 없음',
    excerpt: getPostExcerpt(post.content),
    dateLabel: formatStoryDate(post, source.dateSuffix),
    imageSrc: getAlbumThumbnailSrc(post, null),
    href: source.detailPath(post.id),
  }
}

function StoryBadge({ sourceId, label, tone = 'solid' }) {
  const Icon = BADGE_ICONS[sourceId]

  return (
    <span className={`home-story__badge home-story__badge--${tone}`}>
      {Icon ? <Icon className="home-story__badge-icon" aria-hidden="true" /> : null}
      <span>{label}</span>
    </span>
  )
}

function FeaturedStoryCard({ card }) {
  if (card.empty) {
    return (
      <article className="home-story__card home-story__card--featured home-story__card--empty">
        <div className="home-story__featured-media">
          <StoryBadge sourceId={card.id} label={card.badgeLabel} tone="solid" />
          <div className="home-story__featured-placeholder">
            <p>등록된 게시글이 없습니다.</p>
            <Link to={card.listPath} className="home-story__more-link">
              게시판 보기 →
            </Link>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="home-story__card home-story__card--featured">
      <div className="home-story__featured-media">
        {card.imageSrc ? (
          <img src={card.imageSrc} alt="" className="home-story__featured-image" />
        ) : (
          <div className="home-story__media-fallback" aria-hidden="true" />
        )}
        <div className="home-story__featured-overlay" aria-hidden="true" />
        <StoryBadge sourceId={card.id} label={card.badgeLabel} tone="solid" />
        <div className="home-story__featured-copy">
          {card.dateLabel ? <p className="home-story__featured-date">{card.dateLabel}</p> : null}
          <h3 className="home-story__featured-title">{card.title}</h3>
          {card.excerpt ? <p className="home-story__featured-excerpt">{card.excerpt}</p> : null}
        </div>
      </div>
      <div className="home-story__card-footer">
        <Link to={card.href} className="home-story__more-link">
          자세히 보기 →
        </Link>
      </div>
    </article>
  )
}

function StoryCard({ card }) {
  if (card.empty) {
    return (
      <article className="home-story__card home-story__card--empty">
        <div className="home-story__card-media">
          <StoryBadge sourceId={card.id} label={card.badgeLabel} tone="soft" />
          <div className="home-story__media-fallback home-story__media-fallback--muted" />
        </div>
        <div className="home-story__card-body">
          <h3 className="home-story__card-title">등록된 게시글이 없습니다.</h3>
          <Link to={card.listPath} className="home-story__more-link">
            게시판 보기 →
          </Link>
        </div>
      </article>
    )
  }

  return (
    <article className="home-story__card">
      <div className="home-story__card-media">
        {card.imageSrc ? (
          <img src={card.imageSrc} alt="" className="home-story__card-image" />
        ) : (
          <div className="home-story__media-fallback home-story__media-fallback--muted" />
        )}
        <StoryBadge sourceId={card.id} label={card.badgeLabel} tone="soft" />
      </div>
      <div className="home-story__card-body">
        {card.dateLabel ? <p className="home-story__card-date">{card.dateLabel}</p> : null}
        <h3 className="home-story__card-title">{card.title}</h3>
        {card.excerpt ? <p className="home-story__card-description">{card.excerpt}</p> : null}
        <Link to={card.href} className="home-story__more-link">
          자세히 보기 →
        </Link>
      </div>
    </article>
  )
}

function StoryCardSkeleton({ featured = false }) {
  return (
    <article
      className={`home-story__card home-story__card--skeleton${
        featured ? ' home-story__card--featured' : ''
      }`}
      aria-hidden="true"
    >
      <div className="home-story__skeleton-block" />
    </article>
  )
}

function HomeStory() {
  const [postsBySource, setPostsBySource] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadStoryPosts() {
      setLoading(true)
      const posts = await fetchHomeStoryPosts(HOME_STORY_SOURCES)

      if (isMounted) {
        setPostsBySource(posts)
        setLoading(false)
      }
    }

    loadStoryPosts()

    return () => {
      isMounted = false
    }
  }, [])

  const cards = HOME_STORY_SOURCES.map((source) =>
    mapStoryCard(source, postsBySource[source.id] ?? null),
  )

  return (
    <section className="home-section home-story" aria-label="교회 이야기">
      <div className="home-story__decor home-story__decor--left" aria-hidden="true" />
      <div className="home-story__decor home-story__decor--right" aria-hidden="true" />
      <div className="home-section__inner">
        <HomeSectionHeader
          eyebrow={HOME_STORY.eyebrow}
          title={HOME_STORY.title}
          subtitle={HOME_STORY.subtitle}
        />

        <ul className="home-story__layout">
          {loading
            ? HOME_STORY_SOURCES.map((source) => (
                <li key={source.id} className="home-story__layout-item">
                  <StoryCardSkeleton featured={source.featured} />
                </li>
              ))
            : cards.map((card) => (
                <li key={card.id} className="home-story__layout-item">
                  {card.featured ? <FeaturedStoryCard card={card} /> : <StoryCard card={card} />}
                </li>
              ))}
        </ul>
      </div>
    </section>
  )
}

export default HomeStory
