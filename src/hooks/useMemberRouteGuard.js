import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { buildLoginRedirectPath } from '@/utils/loginRedirect'

export function useMemberRouteGuard() {
  const { isLoggedIn, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const returnPath = `${location.pathname}${location.search}${location.hash}`

  const goToLogin = useCallback(() => {
    navigate(buildLoginRedirectPath(returnPath), { replace: true })
  }, [navigate, returnPath])

  return {
    loading,
    isAllowed: isLoggedIn,
    goToLogin,
    returnPath,
  }
}
