import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { canDeleteAccount, isSuperAdminRole } from '@/services/auth/roles'

export function useSuperAdmin() {
  const { profile, isLoggedIn, loading } = useAuth()

  const isSuperAdmin = useMemo(
    () => isLoggedIn && isSuperAdminRole(profile?.role),
    [isLoggedIn, profile?.role],
  )

  const canDeleteOwnAccount = useMemo(
    () => isLoggedIn && canDeleteAccount(profile),
    [isLoggedIn, profile],
  )

  return { isSuperAdmin, canDeleteOwnAccount, loading }
}
