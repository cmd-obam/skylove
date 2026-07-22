import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoardAdmin } from '@/hooks/useBoardAdmin'

/** 게시글 작성/수정 라우트 — manager 이상 */
export function useAdminRouteGuard() {
  const { canWriteBoard, loading } = useBoardAdmin()
  const navigate = useNavigate()

  const goHome = useCallback(() => {
    navigate('/', { replace: true })
  }, [navigate])

  return {
    loading,
    isAllowed: canWriteBoard,
    goHome,
  }
}
