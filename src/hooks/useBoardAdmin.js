import { useMemo, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { canManageBoardPosts } from '@/services/auth/roles'
import { logBoardAdminDebug } from '@/utils/authRoleDebug'

export function useBoardAdmin() {
  const { profile, isLoggedIn, loading } = useAuth()

  const canManageBoard = useMemo(
    () => isLoggedIn && canManageBoardPosts(profile),
    [isLoggedIn, profile],
  )

  useEffect(() => {
    logBoardAdminDebug({ profile, isLoggedIn, loading, canManageBoard })
  }, [profile, isLoggedIn, loading, canManageBoard])

  return { canManageBoard, loading }
}
