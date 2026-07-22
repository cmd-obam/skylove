import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCmsAdmin } from '@/hooks/useCmsAdmin'

/** CMS(게시글·댓글 관리) — admin 이상 */
export function useCmsAdminRouteGuard() {
  const { isCmsAdmin, loading } = useCmsAdmin()
  const navigate = useNavigate()

  const goHome = useCallback(() => {
    navigate('/member/edit', { replace: true })
  }, [navigate])

  return {
    loading,
    isAllowed: isCmsAdmin,
    goHome,
  }
}
