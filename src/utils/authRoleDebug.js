import {
  canManageBoardPosts,
  canWritePost,
  isAdminRole,
  isBoardWriterRole,
  normalizeRole,
} from '@/services/auth/roles'

export function logAuthRoleDebug(source, details) {
  console.group(`[AuthRoleDebug] ${source}`)
  Object.entries(details).forEach(([key, value]) => {
    console.log(`${key} =`, value)
  })
  console.groupEnd()
}

export function logFetchProfileRoleDebug({ userId, data, mappedProfile }) {
  logAuthRoleDebug('fetchProfileByUserId', {
    userId,
    'fetch role (raw data.role)': data?.role ?? null,
    'normalizeRole(data.role)': normalizeRole(data?.role),
    'mapped profile.role': mappedProfile?.role ?? null,
    'DEFAULT fallback used': data?.role == null || normalizeRole(data?.role) == null,
  })
}

export function logAuthContextProfileDebug(profile) {
  logAuthRoleDebug('AuthContext', {
    'AuthContext profile': profile ?? null,
    'profile.role': profile?.role ?? null,
    isAdminRole: profile ? isAdminRole(profile.role) : false,
    isBoardWriterRole: profile ? isBoardWriterRole(profile.role) : false,
    canWritePost: profile ? canWritePost(profile) : false,
    canManageBoardPosts: profile ? canManageBoardPosts(profile) : false,
  })
}

export function logBoardAdminDebug({
  profile,
  isLoggedIn,
  loading,
  canManageBoard,
  canWriteBoard,
}) {
  logAuthRoleDebug('useBoardAdmin', {
    'AuthContext profile': profile ?? null,
    'profile.role': profile?.role ?? null,
    isLoggedIn,
    loading,
    isAdminRole: profile ? isAdminRole(profile.role) : false,
    isBoardWriterRole: profile ? isBoardWriterRole(profile.role) : false,
    canWritePost: canWritePost(profile),
    canManageBoardPosts: canManageBoardPosts(profile),
    canWriteBoard,
    canManageBoard,
  })
}

export function logBoardWriteButtonDebug({ loading, canWriteBoard, visible }) {
  logAuthRoleDebug('BoardWriteButton', {
    loading,
    canWriteBoard,
    'BoardWriteButton visible': visible,
  })
}
