import { useCallback, useEffect, useState } from 'react'
import { FiPlay } from 'react-icons/fi'
import { PlaceholderVideo } from '@/components/newFamily/shared'
import { getYouTubeThumbnail, NEW_FAMILY_VIDEO } from '@/data/newFamilyGuide'
import './ChurchIntroVideo.css'

function PastorVideoModal({ isOpen, videoUrl, videoTitle, onClose }) {
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const autoplayUrl = videoUrl.includes('?')
    ? `${videoUrl}&autoplay=1`
    : `${videoUrl}?autoplay=1`

  return (
    <div className="nf-video-modal" role="presentation" onClick={onClose}>
      <div
        className="nf-video-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label={videoTitle}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="nf-video-modal__close" onClick={onClose}>
          닫기
        </button>
        <iframe
          src={autoplayUrl}
          title={videoTitle}
          className="nf-video-modal__iframe"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
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
  videoUrl = NEW_FAMILY_VIDEO.videoUrl,
  videoId = NEW_FAMILY_VIDEO.videoId,
  thumbnail = NEW_FAMILY_VIDEO.thumbnail,
  videoTitle = NEW_FAMILY_VIDEO.videoTitle,
  playButtonLabel = NEW_FAMILY_VIDEO.playButtonLabel,
  pastorName = NEW_FAMILY_VIDEO.pastorName,
  pastorRole = NEW_FAMILY_VIDEO.pastorRole,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const thumbnailUrl = thumbnail ?? getYouTubeThumbnail(videoId)

  const openModal = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  return (
    <section className="nf-section nf-video nf-fade" aria-label="교회 소개 영상">
      <div className="nf-video__inner">
        <div className="nf-video__panel">
          <div className="nf-video__panel-copy">
            <p className="nf-video__panel-eyebrow">오직 예수로 세워지는</p>
            <h3 className="nf-video__panel-title">
              하늘사랑교회
              <span className="nf-video__panel-heart" aria-hidden="true">
                ♥
              </span>
            </h3>
            <p className="nf-video__panel-description">
              <span>예수 그리스도를 중심에 두고</span>
              <span>말씀과 사랑으로 걸어가는</span>
              <span>하늘사랑교회를 만나보세요.</span>
            </p>
            <div className="nf-video__panel-illustration" aria-hidden="true">
              <span className="nf-video__panel-ground" />
              <span className="nf-video__panel-church">
                <span className="nf-video__panel-cross-top" />
                <span className="nf-video__panel-roof nf-video__panel-roof--left" />
                <span className="nf-video__panel-roof nf-video__panel-roof--right" />
                <span className="nf-video__panel-tower" />
                <span className="nf-video__panel-window nf-video__panel-window--round" />
                <span className="nf-video__panel-door" />
                <span className="nf-video__panel-wing nf-video__panel-wing--left" />
                <span className="nf-video__panel-wing nf-video__panel-wing--right" />
              </span>
              <span className="nf-video__panel-tree" />
              <span className="nf-video__panel-cloud" />
            </div>
          </div>
        </div>

        <div className="nf-video__media">
          {videoUrl ? (
            <PastorGreetingVideoCard
              thumbnail={thumbnailUrl}
              playButtonLabel={playButtonLabel}
              pastorName={pastorName}
              pastorRole={pastorRole}
              onPlay={openModal}
            />
          ) : (
            <PlaceholderVideo label="영상 영역" thumbnail={thumbnail} className="nf-video__placeholder" />
          )}
        </div>
      </div>

      <PastorVideoModal
        isOpen={isModalOpen}
        videoUrl={videoUrl}
        videoTitle={videoTitle}
        onClose={closeModal}
      />
    </section>
  )
}

export default ChurchIntroVideo
