export function getBoardPostViewerPath(postId) {
  return `/viewer/${postId}`
}

export function openBoardPostViewer(postId) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const path = getBoardPostViewerPath(postId)
  const url = `${window.location.origin}${base}${path}`

  // 로그인 세션은 sessionStorage에 저장됩니다.
  // window.open(..., 'noopener')로 열면 새 탭에 세션이 복사되지 않아
  // 이미 로그인된 사용자도 재로그인 모달이 뜹니다.
  // opener만 즉시 끊어서 세션 복사는 유지하고 창 참조는 차단합니다.
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
