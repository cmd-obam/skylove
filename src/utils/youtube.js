const YOUTUBE_ID_PATTERN =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/

const YOUTUBE_THUMB_PATH_PATTERN =
  /^(https?:\/\/(?:i\d?\.ytimg\.com|img\.youtube\.com)\/vi\/)([A-Za-z0-9_-]{11})\/[A-Za-z0-9_]+\.jpg(?:\?.*)?$/i

/** Prefer 16:9 thumbs without YouTube's hqdefault letterboxing. */
const YOUTUBE_THUMB_QUALITY_FALLBACKS = ['maxresdefault', 'hq720', 'mqdefault', 'hqdefault']

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

export function getYouTubeThumbnailFallbackQualities(currentSrc) {
  const currentQuality =
    typeof currentSrc === 'string'
      ? currentSrc.match(/\/([A-Za-z0-9_]+)\.jpg(?:\?.*)?$/i)?.[1]
      : null

  const startIndex = YOUTUBE_THUMB_QUALITY_FALLBACKS.indexOf(currentQuality)

  return YOUTUBE_THUMB_QUALITY_FALLBACKS.slice(startIndex >= 0 ? startIndex + 1 : 1)
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
