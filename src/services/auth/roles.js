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

export function canDeleteAccount(profile) {
  const role = normalizeRole(profile?.role)

  if (!role) {
    return false
  }

  return role === USER_ROLES.MEMBER || role === USER_ROLES.SUPER_ADMIN
}

export function isKnownRole(role) {
  return isAdminRole(role) || isMemberRole(role)
}
