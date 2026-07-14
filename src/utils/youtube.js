const YOUTUBE_ID_PATTERN =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/

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

export function getYouTubeThumbnail(videoId, quality = 'hqdefault') {
  if (!videoId) {
    return null
  }

  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`
}

export function getYouTubeEmbedUrl(videoId) {
  if (!videoId) {
    return null
  }

  return `https://www.youtube.com/embed/${videoId}`
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
