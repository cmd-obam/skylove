export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MEMBER: 'member',
}

export function isSuperAdminRole(role) {
  return role === USER_ROLES.SUPER_ADMIN
}

export function isAdminRole(role) {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.SUPER_ADMIN
}

export function isMemberRole(role) {
  return role === USER_ROLES.MEMBER
}

export function isKnownRole(role) {
  return isAdminRole(role) || isMemberRole(role)
}
