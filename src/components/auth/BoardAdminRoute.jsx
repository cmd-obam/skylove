import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchCurrentUserProfile } from '@/services/auth/profile'
import { isAdminRole } from '@/services/auth/roles'
import { setAuthSession } from '@/utils/auth'
import AccessDenied from '@/pages/AccessDenied'

function BoardAdminRoute({ children }) {
  const [accessState, setAccessState] = useState('loading')

  useEffect(() => {
    let isMounted = true

    async function verifyAccess() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (!session) {
        setAccessState('denied')
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

    verifyAccess()

    return () => {
      isMounted = false
    }
  }, [])

  if (accessState === 'loading') {
    return null
  }

  if (accessState === 'denied') {
    return <AccessDenied />
  }

  return children
}

export default BoardAdminRoute
