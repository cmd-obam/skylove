import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoardAdmin } from '@/hooks/useBoardAdmin'

/** 게시글 작성/수정 라우트 — 기본 manager 이상, postType 지정 시 게시판별 권한 */
export function useAdminRouteGuard(postType) {
  const { canWriteBoard, loading } = useBoardAdmin(postType)
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
