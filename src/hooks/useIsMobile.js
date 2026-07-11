import { useEffect, useState } from 'react'

export const MOBILE_MAX_WIDTH = 767

export function getIsMobileViewport() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches
}

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(getIsMobileViewport)

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`)
    const handleChange = (event) => setIsMobile(event.matches)

    setIsMobile(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}
