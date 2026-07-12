import { VALID_PROFILE_ROLES } from '@/services/auth/profileSchema'

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MEMBER: 'member',
}

export const ADMIN_ROLES = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]

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

  return normalizedRole != null && ADMIN_ROLES.includes(normalizedRole)
}

export function isMemberRole(role) {
  return normalizeRole(role) === USER_ROLES.MEMBER
}

export function canManageBoardPosts(profile) {
  return isAdminRole(profile?.role)
}

export function canManageMembers(profile) {
  return isSuperAdminRole(profile?.role)
}

export function canChangeMemberRole(targetRole) {
  const role = normalizeRole(targetRole)

  return role === USER_ROLES.MEMBER || role === USER_ROLES.ADMIN
}

export function canDeleteMemberBySuperAdmin(targetRole) {
  const role = normalizeRole(targetRole)

  return role === USER_ROLES.MEMBER || role === USER_ROLES.ADMIN
}

export function getRoleLabel(role) {
  switch (normalizeRole(role)) {
    case USER_ROLES.SUPER_ADMIN:
      return '최고관리자'
    case USER_ROLES.ADMIN:
      return '관리자'
    case USER_ROLES.MEMBER:
      return '일반회원'
    default:
      return role ?? '-'
  }
}

export function getSelfDeleteBlockMessage(role) {
  const normalizedRole = normalizeRole(role)

  if (normalizedRole === USER_ROLES.ADMIN) {
    return '관리자 계정은 직접 탈퇴할 수 없습니다.'
  }

  if (normalizedRole === USER_ROLES.SUPER_ADMIN) {
    return '최고관리자 계정은 직접 탈퇴할 수 없습니다.'
  }

  return null
}

export function canDeleteAccount(profile) {
  return isMemberRole(profile?.role)
}

export function isKnownRole(role) {
  return isAdminRole(role) || isMemberRole(role)
}
