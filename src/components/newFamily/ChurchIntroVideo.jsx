import { useCallback, useState } from 'react'
import { FiPlay } from 'react-icons/fi'
import churchIntroIllustration from '@/assets/images/newFamily/church-intro-illustration.png'
import { PlaceholderVideo } from '@/components/newFamily/shared'
import { getYouTubeThumbnail, NEW_FAMILY_INTRO, NEW_FAMILY_VIDEO } from '@/data/newFamilyGuide'
import './ChurchIntroVideo.css'

function ChurchIntroPanel({
  eyebrow = NEW_FAMILY_INTRO.eyebrow,
  title = NEW_FAMILY_INTRO.title,
  descriptionLines = NEW_FAMILY_INTRO.descriptionLines,
}) {
  return (
    <div className="nf-video__panel">
      <div className="nf-video__panel-copy">
        <div className="nf-video__panel-text">
          <p className="nf-video__panel-eyebrow">{eyebrow}</p>
          <h3 className="nf-video__panel-title">
            {title}
            <span className="nf-video__panel-heart" aria-hidden="true">
              ♥
            </span>
          </h3>
          <p className="nf-video__panel-description">
            {descriptionLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
        </div>
        <div className="nf-video__panel-illustration" aria-hidden="true">
          <img src={churchIntroIllustration} alt="" className="nf-video__panel-church-image" />
        </div>
      </div>
    </div>
  )
}

function PastorGreetingVideoCard({
  thumbnail,
  playButtonLabel,
  pastorName,
  pastorRole,
  onPlay,
}) {
  return (
    <button type="button" className="nf-video__card" onClick={onPlay} aria-label={playButtonLabel}>
      <img src={thumbnail} alt="" className="nf-video__thumbnail" loading="lazy" />
      <span className="nf-video__overlay" aria-hidden="true" />

      <span className="nf-video__cta">
        <FiPlay aria-hidden="true" />
        {playButtonLabel}
      </span>

      <span className="nf-video__play" aria-hidden="true">
        <FiPlay />
      </span>

      <span className="nf-video__caption">
        <span className="nf-video__caption-line" aria-hidden="true" />
        <span className="nf-video__caption-text">
          <span className="nf-video__caption-name">{pastorName}</span>
          <span className="nf-video__caption-role">{pastorRole}</span>
        </span>
      </span>
    </button>
  )
}

function ChurchIntroVideo({
  className = '',
  videoUrl = NEW_FAMILY_VIDEO.videoUrl,
  videoId = NEW_FAMILY_VIDEO.videoId,
  thumbnail = NEW_FAMILY_VIDEO.thumbnail,
  videoTitle = NEW_FAMILY_VIDEO.videoTitle,
  playButtonLabel = NEW_FAMILY_VIDEO.playButtonLabel,
  pastorName = NEW_FAMILY_VIDEO.pastorName,
  pastorRole = NEW_FAMILY_VIDEO.pastorRole,
  eyebrow = NEW_FAMILY_INTRO.eyebrow,
  title = NEW_FAMILY_INTRO.title,
  descriptionLines = NEW_FAMILY_INTRO.descriptionLines,
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const thumbnailUrl = thumbnail ?? getYouTubeThumbnail(videoId)

  const startPlayback = useCallback(() => {
    setIsPlaying(true)
  }, [])

  const autoplayUrl = videoUrl.includes('?') ? `${videoUrl}&autoplay=1` : `${videoUrl}?autoplay=1`

  return (
    <section
      className={`nf-section nf-video nf-fade${className ? ` ${className}` : ''}`}
      aria-label="교회 소개 영상"
    >
      <div className="nf-video__inner">
        <ChurchIntroPanel eyebrow={eyebrow} title={title} descriptionLines={descriptionLines} />

        <div className={`nf-video__media${isPlaying ? ' nf-video__media--playing' : ''}`}>
          {isPlaying && videoUrl ? (
            <iframe
              src={autoplayUrl}
              title={videoTitle}
              className="nf-video__iframe"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : videoUrl ? (
            <PastorGreetingVideoCard
              thumbnail={thumbnailUrl}
              playButtonLabel={playButtonLabel}
              pastorName={pastorName}
              pastorRole={pastorRole}
              onPlay={startPlayback}
            />
          ) : (
            <PlaceholderVideo label="영상 영역" thumbnail={thumbnail} className="nf-video__placeholder" />
          )}
        </div>
      </div>
    </section>
  )
}

export default ChurchIntroVideo
