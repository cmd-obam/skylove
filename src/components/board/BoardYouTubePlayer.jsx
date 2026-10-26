import { useCallback, useEffect, useState } from 'react'
import { FiPlay } from 'react-icons/fi'
import {
  extractYouTubeVideoId,
  getNextYouTubeThumbnailUrl,
  getYouTubeEmbedUrl,
  getYouTubeThumbnail,
  isYouTubeThumbnailPlaceholder,
  upgradeYouTubeThumbnailUrl,
} from '@/utils/youtube'
import '@/pages/worshipWord/WorshipWord.css'

function BoardYouTubePlayer({
  youtubeUrl,
  title = '영상',
  thumbnail = null,
  showPlaceholder = false,
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [posterSrc, setPosterSrc] = useState(null)
  const [mediaAspect, setMediaAspect] = useState(null)
  const videoId = extractYouTubeVideoId(youtubeUrl)
  const embedUrl = getYouTubeEmbedUrl(videoId, { autoplay: isPlaying })

  useEffect(() => {
    setIsPlaying(false)
    setMediaAspect(null)
    const fromStored = upgradeYouTubeThumbnailUrl(thumbnail)
    setPosterSrc(fromStored || getYouTubeThumbnail(videoId) || null)
  }, [thumbnail, videoId])

  const advancePosterQuality = useCallback(
    (currentSrc) => {
      const nextSrc = getNextYouTubeThumbnailUrl(currentSrc, videoId)
      if (!nextSrc) return false
      setPosterSrc(nextSrc)
      return true
    },
    [videoId],
  )

  const handlePosterError = useCallback(
    (event) => {
      advancePosterQuality(event.currentTarget.currentSrc)
    },
    [advancePosterQuality],
  )

  const handlePosterLoad = useCallback(
    (event) => {
      const { naturalWidth, naturalHeight, currentSrc } = event.currentTarget

      if (isYouTubeThumbnailPlaceholder(naturalWidth, naturalHeight)) {
        setMediaAspect(null)
        advancePosterQuality(currentSrc)
        return
      }

      if (naturalWidth > 0 && naturalHeight > 0) {
        setMediaAspect(naturalWidth / naturalHeight)
      }
    },
    [advancePosterQuality],
  )

  if (!embedUrl && !showPlaceholder) {
    return null
  }

  const videoStyle = mediaAspect
    ? { '--worship-video-aspect': String(mediaAspect) }
    : undefined

  return (
    <div
      className={`worship-word-detail__video${
        isPlaying ? ' worship-word-detail__video--playing' : ''
      }`}
      style={videoStyle}
    >
      {embedUrl && isPlaying ? (
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : embedUrl ? (
        <button
          type="button"
          className="worship-word-detail__video-poster"
          onClick={() => setIsPlaying(true)}
          aria-label={`${title} 영상 재생`}
        >
          {posterSrc ? (
            <img
              src={posterSrc}
              alt=""
              className="worship-word-detail__video-thumb"
              onLoad={handlePosterLoad}
              onError={handlePosterError}
            />
          ) : null}
          <span className="worship-word-detail__video-play" aria-hidden="true">
            <FiPlay />
          </span>
        </button>
      ) : (
        <div className="worship-word-detail__video-placeholder">
          유튜브 영상이 등록되지 않았습니다.
        </div>
      )}
    </div>
  )
}

export default BoardYouTubePlayer
