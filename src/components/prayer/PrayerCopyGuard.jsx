import { useEffect, useRef } from 'react'

function isEditableTarget(target) {
  if (!(target instanceof Element)) {
    return false
  }

  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

function PrayerCopyGuard({ children }) {
  const rootRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current

    if (!root) {
      return undefined
    }

    const inside = (target) => target instanceof Node && root.contains(target)

    const handleContextMenu = (event) => {
      if (!inside(event.target) || isEditableTarget(event.target)) {
        return
      }

      event.preventDefault()
    }

    const handleSelectStart = (event) => {
      if (!inside(event.target) || isEditableTarget(event.target)) {
        return
      }

      event.preventDefault()
    }

    const handleCopy = (event) => {
      if (isEditableTarget(event.target) || isEditableTarget(document.activeElement)) {
        return
      }

      if (inside(event.target) || inside(document.activeElement)) {
        event.preventDefault()
      }
    }

    const handleKeyDown = (event) => {
      const key = event.key?.toLowerCase()
      const copying = (event.ctrlKey || event.metaKey) && key === 'c'

      if (!copying || isEditableTarget(event.target)) {
        return
      }

      if (inside(event.target)) {
        event.preventDefault()
      }
    }

    root.addEventListener('contextmenu', handleContextMenu)
    root.addEventListener('selectstart', handleSelectStart)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      root.removeEventListener('contextmenu', handleContextMenu)
      root.removeEventListener('selectstart', handleSelectStart)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div ref={rootRef} className="prayer-shield">
      {children}
    </div>
  )
}

export default PrayerCopyGuard
