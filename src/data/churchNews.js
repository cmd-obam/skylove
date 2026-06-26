export const CHURCH_NEWS_POSTS = [
  {
    id: 1,
    no: 1,
    title: '안녕하세요',
    date: '26.06.26',
    views: 1,
    content: '교회 홈페이지 테스트 중입니다.',
  },
]

export function getChurchNewsPost(postId) {
  return CHURCH_NEWS_POSTS.find((post) => String(post.id) === String(postId)) ?? null
}

export function getAdjacentChurchNewsPosts(postId) {
  const index = CHURCH_NEWS_POSTS.findIndex((post) => String(post.id) === String(postId))

  if (index === -1) {
    return { prev: null, next: null }
  }

  return {
    prev: index > 0 ? CHURCH_NEWS_POSTS[index - 1] : null,
    next: index < CHURCH_NEWS_POSTS.length - 1 ? CHURCH_NEWS_POSTS[index + 1] : null,
  }
}
