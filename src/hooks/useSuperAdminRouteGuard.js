import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSuperAdmin } from '@/hooks/useSuperAdmin'

export function useSuperAdminRouteGuard() {
  const { isSuperAdmin, loading } = useSuperAdmin()
  const navigate = useNavigate()

  const goMypage = useCallback(() => {
    navigate('/member/edit', { replace: true })
  }, [navigate])

  return {
    loading,
    isAllowed: isSuperAdmin,
    goMypage,
  }
}
