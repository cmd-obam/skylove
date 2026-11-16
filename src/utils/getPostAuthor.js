const DEFAULT_AUTHOR = '관리자'

/** 최고관리자(한찬우) 계정의 공개 작성자 표시명 */
export const SUPER_ADMIN_USER_ID = '7144801c-c0a1-4e74-9044-e90f491ff0c9'
const SUPER_ADMIN_STORED_NAME = '한찬우'
const SUPER_ADMIN_PUBLIC_NAME = '게시판지기'

/**
 * 글 저장 시점의 실명이 남아 있어도, 최고관리자 글은 닉네임으로 보여 줍니다.
 */
export function toPublicAuthorLabel(name, userId) {
  const trimmed = String(name ?? '').trim()

  if (!trimmed) {
    return trimmed
  }

  if (trimmed !== SUPER_ADMIN_STORED_NAME) {
    return trimmed
  }

  if (userId && userId !== SUPER_ADMIN_USER_ID) {
    return trimmed
  }

  return SUPER_ADMIN_PUBLIC_NAME
}

/**
 * 게시글 작성자 표시명을 반환합니다.
 * 추후 글쓰기·회원 연동 시 post.authorName, post.author, post.authorId 등으로 확장합니다.
 */
export function getPostAuthor(post, { defaultAuthor = DEFAULT_AUTHOR } = {}) {
  if (!post) {
    return defaultAuthor
  }

  const userId = post.authorId ?? post.author_id ?? null

  if (typeof post.authorName === 'string' && post.authorName.trim()) {
    return toPublicAuthorLabel(post.authorName, userId)
  }

  if (typeof post.author === 'string' && post.author.trim()) {
    return toPublicAuthorLabel(post.author, userId)
  }

  if (typeof post.writer === 'string' && post.writer.trim()) {
    return toPublicAuthorLabel(post.writer, userId)
  }

  // TODO: post.authorId로 Supabase 프로필/회원 정보 조회 후 표시명 반환
  // if (post.authorId) {
  //   return resolveAuthorNameById(post.authorId) ?? defaultAuthor
  // }

  return defaultAuthor
}
