export function getBoardPostViewerPath(postId) {
  return `/viewer/${postId}`
}

export function openBoardPostViewer(postId) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const path = getBoardPostViewerPath(postId)
  const url = `${window.location.origin}${base}${path}`

  window.open(url, '_blank', 'noopener,noreferrer')
}
