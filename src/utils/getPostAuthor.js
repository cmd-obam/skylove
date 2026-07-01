const DEFAULT_AUTHOR = '관리자'

/**
 * 게시글 작성자 표시명을 반환합니다.
 * 추후 글쓰기·회원 연동 시 post.authorName, post.author, post.authorId 등으로 확장합니다.
 */
export function getPostAuthor(post, { defaultAuthor = DEFAULT_AUTHOR } = {}) {
  if (!post) {
    return defaultAuthor
  }

  if (typeof post.authorName === 'string' && post.authorName.trim()) {
    return post.authorName.trim()
  }

  if (typeof post.author === 'string' && post.author.trim()) {
    return post.author.trim()
  }

  if (typeof post.writer === 'string' && post.writer.trim()) {
    return post.writer.trim()
  }

  // TODO: post.authorId로 Supabase 프로필/회원 정보 조회 후 표시명 반환
  // if (post.authorId) {
  //   return resolveAuthorNameById(post.authorId) ?? defaultAuthor
  // }

  return defaultAuthor
}
