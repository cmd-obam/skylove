import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { canAccessCMS, canManagePrayers } from '@/services/auth/roles'

/** 게시글·댓글 관리 또는 중보기도 관리 권한이 있으면 입장 */
export function useCmsAdminRouteGuard() {
  const { profile, isLoggedIn, loading } = useAuth()
  const navigate = useNavigate()
  const isAllowed = useMemo(
    () => isLoggedIn && (canAccessCMS(profile) || canManagePrayers(profile)),
    [isLoggedIn, profile],
  )

  const goHome = useCallback(() => {
    navigate('/member/edit', { replace: true })
  }, [navigate])

  return {
    loading,
    isAllowed,
    goHome,
  }
}
