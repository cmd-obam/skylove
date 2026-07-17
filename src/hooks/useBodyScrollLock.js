import { useEffect, useRef } from 'react'

const LOCK_ATTR = 'data-body-scroll-lock'

function restoreScrollY(scrollY) {
  const { documentElement } = document
  const previousBehavior = documentElement.style.scrollBehavior
  documentElement.style.scrollBehavior = 'auto'
  window.scrollTo(0, scrollY)
  documentElement.style.scrollBehavior = previousBehavior
}

function canElementScroll(element) {
  if (!(element instanceof Element)) {
    return false
  }

  const style = window.getComputedStyle(element)
  const overflowY = style.overflowY
  const allowsScroll = overflowY === 'auto' || overflowY === 'scroll'
  if (!allowsScroll) {
    return false
  }

  return element.scrollHeight > element.clientHeight + 1
}

/**
 * 모바일 오버레이(햄버거 메뉴 등)용 body 스크롤 잠금.
 * - iOS Safari: overflow:hidden 만으로는 배경이 움직이므로 position:fixed + scrollY 복원 사용
 * - 닫을 때 기존 스크롤 위치를 그대로 복원
 *
 * @param {boolean} locked
 * @param {number | null | undefined} scrollYOverride 메뉴를 연 순간의 scrollY (권장)
 */
export default function useBodyScrollLock(locked, scrollYOverride) {
  const scrollYRef = useRef(0)

  useEffect(() => {
    if (!locked) {
      return undefined
    }

    const { body, documentElement } = document
    const override =
      typeof scrollYOverride === 'number' && Number.isFinite(scrollYOverride)
        ? Math.max(0, scrollYOverride)
        : null
    const scrollY = override ?? (window.scrollY || window.pageYOffset || 0)
    scrollYRef.current = scrollY

    const previous = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      bodyTouchAction: body.style.touchAction,
      bodyOverscroll: body.style.overscrollBehavior,
      htmlOverflow: documentElement.style.overflow,
      htmlTouchAction: documentElement.style.touchAction,
      htmlOverscroll: documentElement.style.overscrollBehavior,
      htmlScrollBehavior: documentElement.style.scrollBehavior,
    }

    body.setAttribute(LOCK_ATTR, 'true')
    documentElement.style.scrollBehavior = 'auto'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    body.style.touchAction = 'none'
    body.style.overscrollBehavior = 'none'
    documentElement.style.overflow = 'hidden'
    documentElement.style.touchAction = 'none'
    documentElement.style.overscrollBehavior = 'none'

    const shouldAllowTouchMove = (event) => {
      const target = event.target
      if (!(target instanceof Element)) {
        return false
      }

      const scrollable = target.closest('[data-scroll-lock-allow]')
      return canElementScroll(scrollable)
    }

    const preventTouchScroll = (event) => {
      if (!shouldAllowTouchMove(event)) {
        event.preventDefault()
      }
    }

    const preventWheelScroll = (event) => {
      const target = event.target
      if (!(target instanceof Element)) {
        event.preventDefault()
        return
      }

      const scrollable = target.closest('[data-scroll-lock-allow]')
      if (!canElementScroll(scrollable)) {
        event.preventDefault()
      }
    }

    document.addEventListener('touchmove', preventTouchScroll, { passive: false, capture: true })
    document.addEventListener('wheel', preventWheelScroll, { passive: false, capture: true })

    return () => {
      document.removeEventListener('touchmove', preventTouchScroll, { capture: true })
      document.removeEventListener('wheel', preventWheelScroll, { capture: true })

      body.style.position = previous.bodyPosition
      body.style.top = previous.bodyTop
      body.style.left = previous.bodyLeft
      body.style.right = previous.bodyRight
      body.style.width = previous.bodyWidth
      body.style.overflow = previous.bodyOverflow
      body.style.touchAction = previous.bodyTouchAction
      body.style.overscrollBehavior = previous.bodyOverscroll
      documentElement.style.overflow = previous.htmlOverflow
      documentElement.style.touchAction = previous.htmlTouchAction
      documentElement.style.overscrollBehavior = previous.htmlOverscroll
      documentElement.style.scrollBehavior = previous.htmlScrollBehavior
      body.removeAttribute(LOCK_ATTR)

      restoreScrollY(scrollYRef.current)
    }
  }, [locked, scrollYOverride])
}
