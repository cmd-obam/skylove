export function buildLoginRedirectPath(returnPath) {
  if (!returnPath || !returnPath.startsWith('/') || returnPath.startsWith('//')) {
    return '/login'
  }

  const params = new URLSearchParams({ redirect: returnPath })
  return `/login?${params.toString()}`
}

export function getSafeRedirectPath(redirectPath) {
  if (!redirectPath || !redirectPath.startsWith('/') || redirectPath.startsWith('//')) {
    return '/'
  }

  return redirectPath
}
