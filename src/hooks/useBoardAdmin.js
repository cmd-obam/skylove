import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { canManageBoardPosts } from '@/services/auth/roles'

export function useBoardAdmin() {
  const { profile, isLoggedIn, loading } = useAuth()

  const canManageBoard = useMemo(
    () => isLoggedIn && canManageBoardPosts(profile),
    [isLoggedIn, profile],
  )

  return { canManageBoard, loading }
}
