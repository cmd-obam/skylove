import { useMemo, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  canManageBoardPosts,
  canWritePost,
  canModerateComments,
} from '@/services/auth/roles'
import { logBoardAdminDebug } from '@/utils/authRoleDebug'

export function useBoardAdmin(postType) {
  const { profile, isLoggedIn, loading } = useAuth()

  const canWriteBoard = useMemo(
    () => isLoggedIn && canWritePost(profile, postType),
    [isLoggedIn, profile, postType],
  )

  const canManageBoard = useMemo(
    () => isLoggedIn && canManageBoardPosts(profile),
    [isLoggedIn, profile],
  )

  const canModerateBoardComments = useMemo(
    () => isLoggedIn && canModerateComments(profile),
    [isLoggedIn, profile],
  )

  useEffect(() => {
    logBoardAdminDebug({
      profile,
      isLoggedIn,
      loading,
      canManageBoard,
      canWriteBoard,
      postType,
    })
  }, [profile, isLoggedIn, loading, canManageBoard, canWriteBoard, postType])

  return {
    canWriteBoard,
    canManageBoard,
    canModerateBoardComments,
    loading,
  }
}
