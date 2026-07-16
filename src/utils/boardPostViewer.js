export function getBoardPostViewerPath(postId) {
  return `/viewer/${postId}`
}

export function openBoardPostViewer(postId) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const path = getBoardPostViewerPath(postId)
  const url = `${window.location.origin}${base}${path}`

  // 로그인 세션은 localStorage에 저장됩니다(탭 간 공유).
  // window.open(..., 'noopener')는 불필요하게 opener를 끊을 수 있어,
  // opener만 즉시 끊어서 창 참조만 차단합니다.
  const viewerWindow = window.open(url, '_blank')

  if (!viewerWindow) {
    window.location.assign(`${base}${path}`)
    return
  }

  try {
    viewerWindow.opener = null
  } catch {
    // ignore cross-window assignment errors
  }
}
