export const BOARD_POST_TYPES = [
  { id: 'church_news', label: '교회소식' },
  { id: 'pastor_story', label: '담임목사 이야기' },
  { id: 'album', label: '교회앨범' },
  { id: 'sunday_sermon', label: '주일예배' },
  { id: 'el_shaddai_choir', label: '엘샤다이 찬양단' },
]

export function getBoardLabel(postType) {
  return BOARD_POST_TYPES.find((item) => item.id === postType)?.label ?? postType ?? '-'
}

export function getBoardDetailPath(postType, postId) {
  switch (postType) {
    case 'album':
      return `/church-news/album/${postId}`
    case 'pastor_story':
      return `/church-news/pastor-story/${postId}`
    case 'sunday_sermon':
      return `/worship-word/sunday/${postId}`
    case 'el_shaddai_choir':
      return `/worship-word/el-shaddai/${postId}`
    case 'church_news':
    default:
      return `/church-news/${postId}`
  }
}

export function getBoardEditPath(postType, postId) {
  switch (postType) {
    case 'album':
      return `/album/edit/${postId}`
    case 'pastor_story':
      return `/pastor-story/edit/${postId}`
    case 'sunday_sermon':
      return `/worship-word/sunday/edit/${postId}`
    case 'el_shaddai_choir':
      return `/worship-word/el-shaddai/edit/${postId}`
    case 'church_news':
    default:
      return `/news/edit/${postId}`
  }
}

export function getBoardListPath(postType) {
  switch (postType) {
    case 'album':
      return '/church-news/album'
    case 'pastor_story':
      return '/church-news/pastor-story'
    case 'sunday_sermon':
      return '/worship-word/sunday'
    case 'el_shaddai_choir':
      return '/worship-word/el-shaddai'
    case 'church_news':
    default:
      return '/church-news'
  }
}

export function getCommentDeepLink(postType, postId, commentId) {
  return `${getBoardDetailPath(postType, postId)}#comment-${commentId}`
}

export function getMemberDetailPath(userId) {
  return `/member/management/${userId}`
}

export function getBoardWritePath(postType) {
  switch (postType) {
    case 'album':
      return '/album/write'
    case 'pastor_story':
      return '/pastor-story/write'
    case 'sunday_sermon':
      return '/worship-word/sunday/write'
    case 'el_shaddai_choir':
      return '/worship-word/el-shaddai/write'
    case 'church_news':
    default:
      return '/news/write'
  }
}

/** Map write/edit aliases onto public list paths for category sidebar matching */
export function resolveMenuAliasPath(pathname) {
  if (pathname === '/news/write' || pathname.startsWith('/news/edit/')) {
    return '/church-news'
  }

  if (pathname === '/album/write' || pathname.startsWith('/album/edit/')) {
    return '/church-news/album'
  }

  if (pathname === '/pastor-story/write' || pathname.startsWith('/pastor-story/edit/')) {
    return '/church-news/pastor-story'
  }

  if (
    pathname === '/worship-word/sunday/write' ||
    pathname.startsWith('/worship-word/sunday/edit/')
  ) {
    return '/worship-word/sunday'
  }

  if (
    pathname === '/worship-word/el-shaddai/write' ||
    pathname.startsWith('/worship-word/el-shaddai/edit/')
  ) {
    return '/worship-word/el-shaddai'
  }

  return pathname
}
