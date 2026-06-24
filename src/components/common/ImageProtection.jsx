import { useEffect } from 'react'

const PROTECTED_IMAGE_LAYER_SELECTOR = '.protected-image-layer, .hero__image-layer'

function isProtectedImageTarget(target) {
  if (!(target instanceof Element)) {
    return false
  }

  if (target instanceof HTMLImageElement) {
    return true
  }

  return Boolean(target.closest(PROTECTED_IMAGE_LAYER_SELECTOR))
}

function protectImage(img) {
  img.draggable = false
}

function protectImages(root = document) {
  root.querySelectorAll('img').forEach(protectImage)
}

function ImageProtection() {
  useEffect(() => {
    const handleContextMenu = (event) => {
      if (isProtectedImageTarget(event.target)) {
        event.preventDefault()
      }
    }

    const handleDragStart = (event) => {
      if (event.target instanceof HTMLImageElement) {
        event.preventDefault()
      }
    }

    protectImages(document)

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLImageElement) {
            protectImage(node)
            return
          }

          if (node instanceof Element) {
            protectImages(node)
          }
        })
      })
    })

    observer.observe(document.body, { childList: true, subtree: true })

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('dragstart', handleDragStart)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('dragstart', handleDragStart)
      observer.disconnect()
    }
  }, [])

  return null
}

export default ImageProtection
