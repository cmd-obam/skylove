/**
 * 게시글·댓글 작성 시 사용할 공개 표시명.
 * 기존 저장된 writer/author_name 문자열은 변경하지 않습니다.
 */
export function getPublicDisplayName(profile, { fallback = '회원' } = {}) {
  if (!profile) {
    return fallback
  }

  const nickname = String(profile.nickname ?? '').trim()
  const useNickname = Boolean(profile.nicknameEnabled)

  if (useNickname && nickname) {
    return nickname
  }

  const name = String(profile.name ?? '').trim()
  return name || fallback
}

export function normalizeNickname(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed || ''
}

export function nicknameToDbValue(value) {
  const normalized = normalizeNickname(value)
  return normalized || null
}
