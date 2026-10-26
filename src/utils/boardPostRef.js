import { getBoardDetailPath, getBoardEditPath } from './boardPaths.js'

const UUID_PATTERN =
  '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'

export const BOARD_POST_REF_PATTERN = `${UUID_PATTERN}|[1-9]\\d*`

const UUID_RE = new RegExp(`^${UUID_PATTERN}$`, 'i')
const POST_NO_RE = /^[1-9]\d*$/

export function isBoardPostUuid(value) {
  return UUID_RE.test(String(value ?? '').trim())
}

export function isBoardPostNumber(value) {
  return POST_NO_RE.test(String(value ?? '').trim())
}

export function boardPostLookupKey(value) {
  const key = String(value ?? '').trim()

  if (isBoardPostUuid(key)) {
    return { column: 'id', value: key }
  }

  if (isBoardPostNumber(key)) {
    return { column: 'post_no', value: key }
  }

  return null
}

export function boardPostPublicId(post) {
  if (post?.postNo != null && String(post.postNo) !== '') {
    return String(post.postNo)
  }

  if (post?.post_no != null && String(post.post_no) !== '') {
    return String(post.post_no)
  }

  return String(post?.id ?? '')
}

export function isSameBoardPost(post, requestedId) {
  const key = String(requestedId ?? '')
  if (!post || !key) {
    return false
  }

  return String(post.id) === key || (post.postNo != null && String(post.postNo) === key)
}

export function getBoardPostCanonicalPath(post, requestedId, { mode = 'detail', routePostType } = {}) {
  if (!post) {
    return null
  }

  const publicId = post.postNo != null && String(post.postNo) !== '' ? String(post.postNo) : null
  const typeMismatch = Boolean(routePostType) && post.postType !== routePostType
  const refMismatch = Boolean(publicId) && String(requestedId ?? '') !== publicId

  if (!typeMismatch && !refMismatch) {
    return null
  }

  const pathId = publicId || post.id
  if (!pathId) {
    return null
  }

  return mode === 'edit'
    ? getBoardEditPath(post.postType, pathId)
    : getBoardDetailPath(post.postType, pathId)
}
