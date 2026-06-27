import { isAdminRole } from '@/services/auth/roles'

const AUTH_STORAGE_KEY = 'skylove_auth'
const PROFILE_STORAGE_KEY = 'skylove_profile'

export function isLoggedIn() {
  return localStorage.getItem(AUTH_STORAGE_KEY) === 'true'
}

export function getCurrentProfile() {
  const raw = sessionStorage.getItem(PROFILE_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setAuthSession(profile) {
  localStorage.setItem(AUTH_STORAGE_KEY, 'true')
  sessionStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem(PROFILE_STORAGE_KEY)
}

export function isAdmin() {
  return isAdminRole(getCurrentProfile()?.role)
}

export function isMember() {
  const profile = getCurrentProfile()
  return profile?.role === 'member'
}
