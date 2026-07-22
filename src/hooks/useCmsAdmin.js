import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { canAccessCMS } from '@/services/auth/roles'

export function useCmsAdmin() {
  const { profile, isLoggedIn, loading } = useAuth()

  const isCmsAdmin = useMemo(
    () => isLoggedIn && canAccessCMS(profile),
    [isLoggedIn, profile],
  )

  return { isCmsAdmin, loading }
}
