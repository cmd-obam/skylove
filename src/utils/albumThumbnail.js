export function getAlbumPhotoCount(post) {
  return Array.isArray(post?.images) ? post.images.length : 0
}

export function getAlbumThumbnailSrc(post, placeholderSrc) {
  if (post?.thumbnail) {
    return post.thumbnail
  }

  const firstImage = post?.images?.[0]

  if (firstImage?.src) {
    return firstImage.src
  }

  return placeholderSrc
}
