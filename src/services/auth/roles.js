import { VALID_PROFILE_ROLES } from '@/services/auth/profileSchema'

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member',
  SENIOR_PASTOR: 'senior_pastor',
}

/** 담임목사 이야기 게시판 post_type (글쓰기 예외) */
export const PASTOR_STORY_POST_TYPE = 'pastor_story'

/**
 * 담임목사(최석림) 지정 user_id.
 * 이름 문자열이 아니라 profiles.user_id 기준으로 판별한다.
 * username: rim0691
 */
export const PASTOR_STORY_WRITER_USER_IDS = [
  '1e7c636b-f282-4eee-a2cd-1b6bd0aa3e2f',
]

/** 담임목사(senior_pastor) 글쓰기 가능 게시판 */
export const SENIOR_PASTOR_WRITABLE_POST_TYPES = [
  'church_news',
  'album',
  PASTOR_STORY_POST_TYPE,
]

/** 게시판 글쓰기·업로드 가능 (manager 이상) — 기존 게시판용 */
export const BOARD_WRITER_ROLES = [
  USER_ROLES.MANAGER,
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
]

/** 담임목사 이야기 글쓰기 가능 */
export const PASTOR_STORY_WRITER_ROLES = [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.SENIOR_PASTOR,
]

/** 모든 게시글 관리 (admin 이상) */
export const BOARD_ADMIN_ROLES = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]

/** 댓글 삭제·숨김 등 운영 (manager 이상) */
export const COMMENT_MODERATOR_ROLES = [
  USER_ROLES.MANAGER,
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
]

/** CMS(게시글·댓글 관리) 접근 (admin 이상) */
export const CMS_ADMIN_ROLES = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]

/** Super Admin이 부여/변경 가능한 권한 */
export const ASSIGNABLE_ROLES = [
  USER_ROLES.MEMBER,
  USER_ROLES.MANAGER,
  USER_ROLES.ADMIN,
  USER_ROLES.SENIOR_PASTOR,
]

/** @deprecated BOARD_ADMIN_ROLES 사용 권장 */
export const ADMIN_ROLES = BOARD_ADMIN_ROLES

export function normalizeRole(role) {
  if (typeof role !== 'string') {
    return null
  }

  const normalized = role.trim().toLowerCase()

  return VALID_PROFILE_ROLES.includes(normalized) ? normalized : null
}

export function isSuperAdminRole(role) {
  return normalizeRole(role) === USER_ROLES.SUPER_ADMIN
}

export function isAdminRole(role) {
  const normalizedRole = normalizeRole(role)

  return normalizedRole != null && BOARD_ADMIN_ROLES.includes(normalizedRole)
}

export function isManagerRole(role) {
  return normalizeRole(role) === USER_ROLES.MANAGER
}

export function isMemberRole(role) {
  return normalizeRole(role) === USER_ROLES.MEMBER
}

export function isSeniorPastorRole(role) {
  return normalizeRole(role) === USER_ROLES.SENIOR_PASTOR
}

export function isBoardWriterRole(role) {
  const normalizedRole = normalizeRole(role)

  return normalizedRole != null && BOARD_WRITER_ROLES.includes(normalizedRole)
}

export function isPastorStoryPostType(postType) {
  return postType === PASTOR_STORY_POST_TYPE
}

function getPostTypeFromPost(post) {
  return post?.postType ?? post?.post_type ?? null
}

export function isCommentModeratorRole(role) {
  const normalizedRole = normalizeRole(role)

  return normalizedRole != null && COMMENT_MODERATOR_ROLES.includes(normalizedRole)
}

export function isCmsAdminRole(role) {
  const normalizedRole = normalizeRole(role)

  return normalizedRole != null && CMS_ADMIN_ROLES.includes(normalizedRole)
}

function getProfileRole(profileOrRole) {
  if (profileOrRole == null) {
    return null
  }

  if (typeof profileOrRole === 'string') {
    return normalizeRole(profileOrRole)
  }

  return normalizeRole(profileOrRole.role)
}

function getProfileUserId(profile, fallbackUserId = null) {
  if (profile != null && typeof profile === 'object') {
    return (
      profile.effectiveUserId ??
      profile.userId ??
      profile.user_id ??
      fallbackUserId ??
      null
    )
  }

  return fallbackUserId
}

function isOwnResource(authorId, currentUserId) {
  return Boolean(currentUserId && authorId && authorId === currentUserId)
}

/** 담임목사 지정 user_id (최석림) 여부 */
export function isPastorStoryDesignatedWriter(profile, currentUserId = null) {
  const userId = getProfileUserId(profile, currentUserId)

  return Boolean(userId && PASTOR_STORY_WRITER_USER_IDS.includes(userId))
}

export function isSeniorPastorWritablePostType(postType) {
  return SENIOR_PASTOR_WRITABLE_POST_TYPES.includes(postType)
}

/** 담임목사 이야기 글쓰기 가능 (최고관리자 · senior_pastor · 지정 user_id) */
export function canWritePastorStory(profile, currentUserId = null) {
  const role = getProfileRole(profile)

  if (role != null && PASTOR_STORY_WRITER_ROLES.includes(role)) {
    return true
  }

  return isPastorStoryDesignatedWriter(profile, currentUserId)
}

function canWriteAsSeniorPastor(profile, postType, currentUserId = null) {
  if (!isSeniorPastorWritablePostType(postType)) {
    return false
  }

  return (
    isSeniorPastorRole(getProfileRole(profile)) ||
    isPastorStoryDesignatedWriter(profile, currentUserId)
  )
}

/** 게시판 글쓰기·이미지·첨부 업로드 (postType 지정 시 게시판별 예외 적용) */
export function canWritePost(profile, postType, currentUserId = null) {
  if (isPastorStoryPostType(postType)) {
    return canWritePastorStory(profile, currentUserId)
  }

  if (isBoardWriterRole(getProfileRole(profile))) {
    return true
  }

  return canWriteAsSeniorPastor(profile, postType, currentUserId)
}

/**
 * 모든 게시글에 대한 운영 권한 (admin 이상).
 * manager는 본인 글만 가능하므로 canEditPost / canDeletePost 사용.
 */
export function canManageBoardPosts(profile) {
  return isAdminRole(getProfileRole(profile))
}

export function canEditPost(profile, post, currentUserId) {
  const role = getProfileRole(profile)
  const postType = getPostTypeFromPost(post)
  const effectiveUserId = getProfileUserId(profile, currentUserId)

  if (isPastorStoryPostType(postType)) {
    if (isSuperAdminRole(role)) {
      return true
    }

    if (isSeniorPastorRole(role) || isPastorStoryDesignatedWriter(profile, effectiveUserId)) {
      return isOwnResource(post?.authorId ?? post?.author_id, effectiveUserId)
    }

    return false
  }

  if (isAdminRole(role)) {
    return true
  }

  if (isManagerRole(role)) {
    return isOwnResource(post?.authorId ?? post?.author_id, currentUserId)
  }

  if (canWriteAsSeniorPastor(profile, postType, effectiveUserId)) {
    return isOwnResource(post?.authorId ?? post?.author_id, effectiveUserId)
  }

  return false
}

export function canDeletePost(profile, post, currentUserId) {
  return canEditPost(profile, post, currentUserId)
}

export function canHidePost(profile, post, currentUserId) {
  return canEditPost(profile, post, currentUserId)
}

/** 댓글 작성 — 로그인 회원 전원 (게시판 정책은 UI에서 추가 제한 가능) */
export function canWriteComment(profile, isLoggedIn = Boolean(profile)) {
  return Boolean(isLoggedIn && getProfileRole(profile))
}

export function canEditComment(profile, comment, currentUserId) {
  if (isAdminRole(getProfileRole(profile))) {
    return true
  }

  return isOwnResource(comment?.userId ?? comment?.user_id, currentUserId)
}

/**
 * Manager는 작성자와 관계없이 모든 댓글 삭제 가능.
 * Admin / Super Admin도 동일.
 * 일반회원은 본인 댓글만.
 */
export function canDeleteComment(profile, comment, currentUserId) {
  if (isCommentModeratorRole(getProfileRole(profile))) {
    return true
  }

  return isOwnResource(comment?.userId ?? comment?.user_id, currentUserId)
}

/** Manager 이상: 모든 댓글 숨김 */
export function canHideComment(profile) {
  return isCommentModeratorRole(getProfileRole(profile))
}

export function canModerateComments(profile) {
  return isCommentModeratorRole(getProfileRole(profile))
}

export function canAccessCMS(profile) {
  return isCmsAdminRole(getProfileRole(profile))
}

export function canManageMembers(profile) {
  return isSuperAdminRole(getProfileRole(profile))
}

export function canChangeMemberRole(targetRole) {
  const role = normalizeRole(targetRole)

  return role != null && ASSIGNABLE_ROLES.includes(role)
}

export function canDeleteMemberBySuperAdmin(targetRole) {
  return canChangeMemberRole(targetRole)
}

export function getRoleLabel(role) {
  switch (normalizeRole(role)) {
    case USER_ROLES.SUPER_ADMIN:
      return '최고관리자'
    case USER_ROLES.ADMIN:
      return '관리자'
    case USER_ROLES.SENIOR_PASTOR:
      return '담임목사'
    case USER_ROLES.MANAGER:
      return '매니저'
    case USER_ROLES.MEMBER:
      return '일반회원'
    default:
      return role ?? '-'
  }
}

export function getRoleBadgeTone(role) {
  switch (normalizeRole(role)) {
    case USER_ROLES.SUPER_ADMIN:
      return 'super_admin'
    case USER_ROLES.ADMIN:
      return 'admin'
    case USER_ROLES.SENIOR_PASTOR:
      return 'senior_pastor'
    case USER_ROLES.MANAGER:
      return 'manager'
    case USER_ROLES.MEMBER:
      return 'member'
    default:
      return 'member'
  }
}

export function getSelfDeleteBlockMessage(role) {
  const normalizedRole = normalizeRole(role)

  if (normalizedRole === USER_ROLES.MANAGER) {
    return '매니저 계정은 직접 탈퇴할 수 없습니다.'
  }

  if (normalizedRole === USER_ROLES.ADMIN) {
    return '관리자 계정은 직접 탈퇴할 수 없습니다.'
  }

  if (normalizedRole === USER_ROLES.SENIOR_PASTOR) {
    return '담임목사 계정은 직접 탈퇴할 수 없습니다.'
  }

  if (normalizedRole === USER_ROLES.SUPER_ADMIN) {
    return '최고관리자 계정은 직접 탈퇴할 수 없습니다.'
  }

  return null
}

export function canDeleteAccount(profile) {
  return isMemberRole(getProfileRole(profile))
}

export function isKnownRole(role) {
  return normalizeRole(role) != null
}
