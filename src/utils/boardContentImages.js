/**
 * Extract image src URLs from board HTML content.
 */
export function extractContentImageSrcs(html) {
  if (!html || typeof html !== 'string') {
    return []
  }

  const matches = html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)
  const srcs = []

  for (const match of matches) {
    const src = match[1]?.trim()
    if (src) {
      srcs.push(src)
    }
  }

  return srcs
}

export function getFirstContentImageSrc(html) {
  return extractContentImageSrcs(html)[0] ?? null
}

/**
 * True when the post should show an image indicator.
 */
export function computeHasImage({ contentHtml, thumbnail, images }) {
  if (thumbnail) {
    return true
  }

  if (Array.isArray(images) && images.length > 0) {
    return true
  }

  return extractContentImageSrcs(contentHtml).length > 0
}

/**
 * Try to derive a storage path from a public Supabase storage URL.
 */
export function extractStoragePathFromPublicUrl(url) {
  if (!url || typeof url !== 'string') {
    return null
  }

  const marker = '/object/public/board-uploads/'
  const index = url.indexOf(marker)

  if (index === -1) {
    return null
  }

  return decodeURIComponent(url.slice(index + marker.length).split('?')[0])
}
