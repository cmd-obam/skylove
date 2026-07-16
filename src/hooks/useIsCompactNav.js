import { useEffect, useState } from 'react'

/** 햄버거 메뉴가 노출되는 구간 (SiteHeader와 동일) */
export const COMPACT_NAV_MAX_WIDTH = 1024

export function getIsCompactNavViewport() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia(`(max-width: ${COMPACT_NAV_MAX_WIDTH}px)`).matches
}

export default function useIsCompactNav() {
  const [isCompactNav, setIsCompactNav] = useState(getIsCompactNavViewport)

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${COMPACT_NAV_MAX_WIDTH}px)`)
    const handleChange = (event) => setIsCompactNav(event.matches)

    setIsCompactNav(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isCompactNav
}
