export function formatBoardPostTitle(title, commentsCount) {
  if (!commentsCount || commentsCount <= 0) {
    return title
  }

  return `${title} (${commentsCount})`
}
