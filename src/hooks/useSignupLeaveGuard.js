import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const BACK_NAVIGATION = '__BACK__'

function normalizePath(pathname, basename = '') {
  const normalizedBase = basename.replace(/\/$/, '')
  let path = pathname

  if (normalizedBase && path.startsWith(normalizedBase)) {
    path = path.slice(normalizedBase.length) || '/'
  }

  return path.replace(/\/$/, '') || '/'
}

export function useSignupLeaveGuard({ isDirty, onConfirmLeave }) {
  const navigate = useNavigate()
  const location = useLocation()
  const basename = import.meta.env.BASE_URL ?? '/'
  const allowLeaveRef = useRef(false)
  const pendingNavigationRef = useRef(null)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)

  const allowNavigation = useCallback(() => {
    allowLeaveRef.current = true
  }, [])

  const cancelLeave = useCallback(() => {
    pendingNavigationRef.current = null
    setIsLeaveModalOpen(false)
  }, [])

  const confirmLeave = useCallback(() => {
    allowLeaveRef.current = true
    setIsLeaveModalOpen(false)
    onConfirmLeave()

    const pending = pendingNavigationRef.current
    pendingNavigationRef.current = null

    if (pending === BACK_NAVIGATION) {
      window.history.go(-2)
      return
    }

    if (pending) {
      navigate(pending)
    }
  }, [navigate, onConfirmLeave])

  useEffect(() => {
    if (!isDirty || allowLeaveRef.current) {
      return undefined
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty])

  useEffect(() => {
    if (!isDirty || allowLeaveRef.current) {
      return undefined
    }

    const handleClick = (event) => {
      if (event.defaultPrevented) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      const anchor = event.target.closest('a[href]')

      if (!anchor || anchor.getAttribute('target') === '_blank') {
        return
      }

      const href = anchor.getAttribute('href')

      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return
      }

      let url

      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }

      if (url.origin !== window.location.origin) {
        return
      }

      const currentPath = normalizePath(location.pathname, basename)
      const nextPath = normalizePath(url.pathname, basename)

      if (nextPath === currentPath) {
        return
      }

      event.preventDefault()
      pendingNavigationRef.current = `${nextPath}${url.search}${url.hash}`
      setIsLeaveModalOpen(true)
    }

    document.addEventListener('click', handleClick, true)

    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [basename, isDirty, location.pathname])

  useEffect(() => {
    if (!isDirty || allowLeaveRef.current) {
      return undefined
    }

    window.history.pushState({ signupLeaveGuard: true }, '')

    const handlePopState = () => {
      window.history.pushState({ signupLeaveGuard: true }, '')
      pendingNavigationRef.current = BACK_NAVIGATION
      setIsLeaveModalOpen(true)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isDirty])

  return {
    isLeaveModalOpen,
    cancelLeave,
    confirmLeave,
    allowNavigation,
  }
}
