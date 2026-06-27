import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { fetchCurrentUserProfile } from '@/services/auth/profile'
import { isAdminRole } from '@/services/auth/roles'
import { setAuthSession } from '@/utils/auth'

function AdminRoute({ children }) {
  const [accessState, setAccessState] = useState('loading')

  useEffect(() => {
    let isMounted = true

    async function verifyAdminAccess() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (!session) {
        setAccessState('unauthenticated')
        return
      }

      const profileResult = await fetchCurrentUserProfile()

      if (!isMounted) {
        return
      }

      if (!profileResult.success) {
        setAccessState('denied')
        return
      }

      setAuthSession(profileResult.profile)

      if (isAdminRole(profileResult.profile.role)) {
        setAccessState('allowed')
        return
      }

      setAccessState('denied')
    }

    verifyAdminAccess()

    return () => {
      isMounted = false
    }
  }, [])

  if (accessState === 'loading') {
    return null
  }

  if (accessState === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  if (accessState === 'denied') {
    return <Navigate to="/" replace />
  }

  return children
}

export default AdminRoute
