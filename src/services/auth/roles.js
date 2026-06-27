export const USER_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
}

export function isAdminRole(role) {
  return role === USER_ROLES.ADMIN
}

export function isMemberRole(role) {
  return role === USER_ROLES.MEMBER
}

export function isKnownRole(role) {
  return isAdminRole(role) || isMemberRole(role)
}
