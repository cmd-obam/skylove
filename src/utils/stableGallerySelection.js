const GALLERY_LIMIT = 4

function hashString(value) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function createRandom(seed) {
  let state = seed >>> 0

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

/**
 * Pick up to four album photos. The choice depends only on the photo list,
 * so a refresh shows the same images until the album photos change.
 */
export function selectStableGalleryImages(images, limit = GALLERY_LIMIT) {
  if (!Array.isArray(images) || images.length <= limit) {
    return images ?? []
  }

  const seed = hashString(
    images
      .map((image) => image.src)
      .slice()
      .sort()
      .join('\n'),
  )
  const random = createRandom(seed)
  const indexed = images.map((image, index) => ({ image, index }))

  for (let index = indexed.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = indexed[index]
    indexed[index] = indexed[swapIndex]
    indexed[swapIndex] = current
  }

  return indexed
    .slice(0, limit)
    .sort((left, right) => left.index - right.index)
    .map((item) => item.image)
}
