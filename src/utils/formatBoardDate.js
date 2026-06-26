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
