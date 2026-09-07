const YOUTUBE_ID_PATTERN =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/

const YOUTUBE_THUMB_PATH_PATTERN =
  /^(https?:\/\/(?:i\d?\.ytimg\.com|img\.youtube\.com)\/vi\/)([A-Za-z0-9_-]{11})\/[A-Za-z0-9_]+\.jpg(?:\?.*)?$/i

/**
 * Prefer true 16:9 thumbs. Avoid hqdefault/sddefault first — those are 4:3 frames
 * with YouTube-added letterboxing that looks like site-added black bars.
 * Missing maxresdefault often returns a 120x90 placeholder (loads without error).
 */
export const YOUTUBE_THUMB_QUALITY_FALLBACKS = [
  'maxresdefault',
  'hq720',
  'mqdefault',
  'sddefault',
  'hqdefault',
]

export function extractYouTubeVideoId(url) {
  if (typeof url !== 'string') {
    return null
  }

  const trimmed = url.trim()

  if (!trimmed) {
    return null
  }

  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return trimmed
  }

  try {
    const parsed = new URL(trimmed)
    const fromSearch = parsed.searchParams.get('v')

    if (fromSearch && /^[A-Za-z0-9_-]{11}$/.test(fromSearch)) {
      return fromSearch
    }
  } catch {
    // fall through to regex
  }

  const fromThumb = trimmed.match(YOUTUBE_THUMB_PATH_PATTERN)
  if (fromThumb?.[2]) {
    return fromThumb[2]
  }

  const match = trimmed.match(YOUTUBE_ID_PATTERN)
  return match?.[1] ?? null
}

export function getYouTubeThumbnail(videoId, quality = 'maxresdefault') {
  if (!videoId) {
    return null
  }

  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`
}

export function upgradeYouTubeThumbnailUrl(url) {
  if (typeof url !== 'string' || !url.trim()) {
    return url
  }

  const match = url.trim().match(YOUTUBE_THUMB_PATH_PATTERN)

  if (!match) {
    return url
  }

  return getYouTubeThumbnail(match[2], 'maxresdefault')
}

/** YouTube returns a tiny 120×90 image when maxresdefault does not exist. */
export function isYouTubeThumbnailPlaceholder(width, height) {
  if (!width || !height) {
    return true
  }

  return width <= 120 || height <= 90
}

export function getYouTubeThumbnailFallbackQualities(currentSrc) {
  const currentQuality =
    typeof currentSrc === 'string'
      ? currentSrc.match(/\/([A-Za-z0-9_]+)\.jpg(?:\?.*)?$/i)?.[1]
      : null

  const startIndex = YOUTUBE_THUMB_QUALITY_FALLBACKS.indexOf(currentQuality)

  return YOUTUBE_THUMB_QUALITY_FALLBACKS.slice(startIndex >= 0 ? startIndex + 1 : 1)
}

export function getNextYouTubeThumbnailUrl(currentSrc, videoIdHint = null) {
  const videoId = videoIdHint || extractYouTubeVideoId(currentSrc)

  if (!videoId) {
    return null
  }

  for (const quality of getYouTubeThumbnailFallbackQualities(currentSrc)) {
    const nextSrc = getYouTubeThumbnail(videoId, quality)

    if (nextSrc && nextSrc !== currentSrc) {
      return nextSrc
    }
  }

  return null
}

export function getYouTubeEmbedUrl(videoId, { autoplay = false } = {}) {
  if (!videoId) {
    return null
  }

  const base = `https://www.youtube.com/embed/${videoId}`
  return autoplay ? `${base}?autoplay=1&rel=0` : `${base}?rel=0`
}

export function resolveYouTubeMedia(url) {
  const videoId = extractYouTubeVideoId(url)

  if (!videoId) {
    return null
  }

  return {
    videoId,
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: getYouTubeEmbedUrl(videoId),
    thumbnail: getYouTubeThumbnail(videoId),
  }
}
