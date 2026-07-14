export function formatBoardDate(date) {
  if (!date) {
    return ''
  }

  if (/^\d{2}\.\d{2}\.\d{2}$/.test(date)) {
    return date
  }

  const dottedMatch = date.match(/^(\d{4})\.(\d{2})\.(\d{2})$/)

  if (dottedMatch) {
    return `${dottedMatch[1].slice(-2)}.${dottedMatch[2]}.${dottedMatch[3]}`
  }

  const parsedDate = new Date(date)

  if (!Number.isNaN(parsedDate.getTime())) {
    const year = String(parsedDate.getFullYear()).slice(-2)
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
    const day = String(parsedDate.getDate()).padStart(2, '0')

    return `${year}.${month}.${day}`
  }

  return date
}

function padTwo(value) {
  return String(value).padStart(2, '0')
}

/**
 * 게시글 작성일시 표시 문자열을 반환합니다.
 * post.createdAt이 있으면 YYYY-MM-DD HH:mm:ss 형식으로 표시합니다.
 */
export function formatPostDateTime(post) {
  if (!post) {
    return ''
  }

  if (post.createdAt) {
    const parsedDate = new Date(post.createdAt)

    if (!Number.isNaN(parsedDate.getTime())) {
      return `${parsedDate.getFullYear()}-${padTwo(parsedDate.getMonth() + 1)}-${padTwo(parsedDate.getDate())} ${padTwo(parsedDate.getHours())}:${padTwo(parsedDate.getMinutes())}:${padTwo(parsedDate.getSeconds())}`
    }
  }

  return formatBoardDate(post.date)
}

export function formatPostRegistrationDate(post) {
  if (!post) {
    return ''
  }

  if (post.createdAt) {
    const parsedDate = new Date(post.createdAt)

    if (!Number.isNaN(parsedDate.getTime())) {
      return `${parsedDate.getFullYear()}.${padTwo(parsedDate.getMonth() + 1)}.${padTwo(parsedDate.getDate())}`
    }
  }

  const shortDate = formatBoardDate(post.date)

  if (/^\d{2}\.\d{2}\.\d{2}$/.test(shortDate)) {
    const [year, month, day] = shortDate.split('.')
    return `20${year}.${month}.${day}`
  }

  if (/^\d{4}\.\d{2}\.\d{2}$/.test(shortDate)) {
    return shortDate
  }

  return shortDate
}

export function formatCommentDateTime(value) {
  if (!value) {
    return ''
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return `${parsedDate.getFullYear()}.${padTwo(parsedDate.getMonth() + 1)}.${padTwo(parsedDate.getDate())} ${padTwo(parsedDate.getHours())}:${padTwo(parsedDate.getMinutes())}`
}

/**
 * 상대 시간 표시. 하루 이내: n분전 / n시간전, 이후: YYYY-MM-DD
 */
export function formatRelativeTime(value) {
  if (!value) {
    return ''
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  const diffMs = Date.now() - parsedDate.getTime()

  if (diffMs < 0) {
    return `${parsedDate.getFullYear()}-${padTwo(parsedDate.getMonth() + 1)}-${padTwo(parsedDate.getDate())}`
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) {
    return '방금 전'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분전`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours}시간전`
  }

  return `${parsedDate.getFullYear()}-${padTwo(parsedDate.getMonth() + 1)}-${padTwo(parsedDate.getDate())}`
}
