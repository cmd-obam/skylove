import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { buildLoginRedirectPath } from '@/utils/loginRedirect'

export function useMemberRouteGuard() {
  const [accessState, setAccessState] = useState('loading')
  const location = useLocation()
  const navigate = useNavigate()

  const returnPath = `${location.pathname}${location.search}${location.hash}`

  useEffect(() => {
    let isMounted = true

    async function verifyMemberAccess() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      setAccessState(session?.user ? 'allowed' : 'denied')
    }

    verifyMemberAccess()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return
      }

      setAccessState(session?.user ? 'allowed' : 'denied')
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const goToLogin = useCallback(() => {
    navigate(buildLoginRedirectPath(returnPath), { replace: true })
  }, [navigate, returnPath])

  return {
    loading: accessState === 'loading',
    isAllowed: accessState === 'allowed',
    goToLogin,
    returnPath,
  }
}
