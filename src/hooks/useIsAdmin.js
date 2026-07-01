import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminRole } from '@/services/auth/roles'

export function useIsAdmin() {
  const { profile, loading } = useAuth()

  const isAdmin = useMemo(() => isAdminRole(profile?.role), [profile?.role])

  return { isAdmin, loading }
}
