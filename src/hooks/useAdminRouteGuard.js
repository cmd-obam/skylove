import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoardAdmin } from '@/hooks/useBoardAdmin'

export function useAdminRouteGuard() {
  const { canManageBoard, loading } = useBoardAdmin()
  const navigate = useNavigate()

  const goHome = useCallback(() => {
    navigate('/', { replace: true })
  }, [navigate])

  return {
    loading,
    isAllowed: canManageBoard,
    goHome,
  }
}
