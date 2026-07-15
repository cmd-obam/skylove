import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FiArrowDown,
  FiArrowUp,
  FiHelpCircle,
  FiLink,
  FiMessageSquare,
  FiPlus,
  FiPrinter,
  FiType,
  FiX,
  FiZoomIn,
  FiZoomOut,
} from 'react-icons/fi'
import './PostUtilityBar.css'

const CONTENT_SELECTOR = '.church-news-detail'
const BOUNDARY_SELECTOR = '.category-layout__main'
const MOBILE_BREAKPOINT = 1024
const FONT_SCALES = [1, 1.15, 1.3]
const MIN_ZOOM = 0.8
const MAX_ZOOM = 1.5
const ZOOM_STEP = 0.1
const POSITION_PADDING = 12
const MOBILE_EDGE_GAP = 16

const HELP_MESSAGE =
  '도움말: 글자크기 버튼으로 본문 글자 크기를 조절할 수 있습니다. 확대·축소 버튼으로 게시글 전체 내용을 키우거나 줄일 수 있습니다. 위로·아래로 버튼으로 페이지 이동, 댓글 버튼으로 댓글 영역으로 이동할 수 있습니다.'

function PostUtilityBar() {
  const barRef = useRef(null)
  const mobileRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [fontScaleIndex, setFontScaleIndex] = useState(0)
  const [contentZoom, setContentZoom] = useState(1)
  const [linkCopied, setLinkCopied] = useState(false)

  const getContentElement = useCallback(
    () => document.querySelector(CONTENT_SELECTOR),
    [],
  )

  const updateDesktopPosition = useCallback(() => {
    const bar = barRef.current
    const boundary = document.querySelector(BOUNDARY_SELECTOR)

    if (!bar || !boundary) {
      return
    }

    const boundaryRect = boundary.getBoundingClientRect()
    const barHeight = bar.offsetHeight
    const preferredTop = window.innerHeight * 0.5 - barHeight * 0.5
    const minTop = boundaryRect.top + POSITION_PADDING
    const maxTop = boundaryRect.bottom - barHeight - POSITION_PADDING

    if (
      boundaryRect.bottom < POSITION_PADDING ||
      boundaryRect.top > window.innerHeight - POSITION_PADDING
    ) {
      bar.style.visibility = 'hidden'
      return
    }

    bar.style.visibility = 'visible'

    let top = preferredTop
    if (maxTop >= minTop) {
      top = Math.max(minTop, Math.min(maxTop, preferredTop))
    } else {
      top = minTop
    }

    bar.style.top = `${top}px`
  }, [])

  const updateMobilePosition = useCallback(() => {
    const mobile = mobileRef.current
    const boundary = document.querySelector(BOUNDARY_SELECTOR)

    if (!mobile || !boundary) {
      return
    }

    const boundaryRect = boundary.getBoundingClientRect()
    const mobileHeight = mobile.offsetHeight

    if (
      boundaryRect.bottom < POSITION_PADDING ||
      boundaryRect.top > window.innerHeight - POSITION_PADDING
    ) {
      mobile.style.visibility = 'hidden'
      return
    }

    mobile.style.visibility = 'visible'

    const preferredBottom = MOBILE_EDGE_GAP
    const minBottom = window.innerHeight - boundaryRect.bottom + POSITION_PADDING
    const maxBottom = window.innerHeight - boundaryRect.top - POSITION_PADDING - mobileHeight

    let bottom = Math.max(preferredBottom, minBottom)
    if (maxBottom >= minBottom) {
      bottom = Math.min(bottom, maxBottom)
    }

    mobile.style.bottom = `${bottom}px`
    mobile.style.right = `${MOBILE_EDGE_GAP}px`
  }, [])

  const updatePosition = useCallback(() => {
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      updateMobilePosition()
      return
    }

    updateDesktopPosition()
  }, [updateDesktopPosition, updateMobilePosition])

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)

    const handleMediaChange = (event) => {
      setIsMobile(event.matches)
      if (!event.matches) {
        setIsMenuOpen(false)
      }
    }

    setIsMobile(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleMediaChange)

    return () => mediaQuery.removeEventListener('change', handleMediaChange)
  }, [])

  useEffect(() => {
    updatePosition()

    window.addEventListener('scroll', updatePosition, { passive: true })
    window.addEventListener('resize', updatePosition)

    const boundary = document.querySelector(BOUNDARY_SELECTOR)
    const resizeObserver = new ResizeObserver(updatePosition)

    if (boundary) {
      resizeObserver.observe(boundary)
    }

    if (barRef.current) {
      resizeObserver.observe(barRef.current)
    }

    if (mobileRef.current) {
      resizeObserver.observe(mobileRef.current)
    }

    return () => {
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
      resizeObserver.disconnect()
    }
  }, [updatePosition, isMenuOpen, isMobile])

  useEffect(() => {
    const content = getContentElement()
    if (!content) {
      return undefined
    }

    content.style.setProperty('--post-font-scale', String(FONT_SCALES[fontScaleIndex]))
    content.classList.add('church-news-detail--utility-controlled')

    return () => {
      content.style.removeProperty('--post-font-scale')
      content.classList.remove('church-news-detail--utility-controlled')
    }
  }, [fontScaleIndex, getContentElement])

  useEffect(() => {
    const content = getContentElement()
    if (!content) {
      return undefined
    }

    content.style.setProperty('--post-content-zoom', String(contentZoom))

    return () => {
      content.style.removeProperty('--post-content-zoom')
    }
  }, [contentZoom, getContentElement])

  useEffect(() => {
    if (!linkCopied) {
      return undefined
    }

    const timer = window.setTimeout(() => setLinkCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [linkCopied])

  useEffect(() => {
    if (!isMobile || !isMenuOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (mobileRef.current?.contains(event.target)) {
        return
      }

      setIsMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isMobile, isMenuOpen])

  const handleFontSize = () => {
    setFontScaleIndex((prev) => (prev + 1) % FONT_SCALES.length)
  }

  const handleZoomIn = () => {
    setContentZoom((prev) => Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(1))))
  }

  const handleZoomOut = () => {
    setContentZoom((prev) => Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(1))))
  }

  const handleScrollTop = () => {
    const boundary = document.querySelector(BOUNDARY_SELECTOR)
    if (boundary) {
      const top = boundary.getBoundingClientRect().top + window.scrollY
      window.scrollTo({ top, behavior: 'smooth' })
      return
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleScrollBottom = () => {
    const boundary = document.querySelector(BOUNDARY_SELECTOR)
    if (boundary) {
      const bottom = boundary.getBoundingClientRect().bottom + window.scrollY
      window.scrollTo({ top: bottom - window.innerHeight + POSITION_PADDING, behavior: 'smooth' })
      return
    }

    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
  }

  const handleScrollToComments = () => {
    setIsMenuOpen(false)
    document.getElementById('board-post-comments')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
    } catch {
      window.prompt('아래 링크를 복사하세요.', window.location.href)
    }
  }

  const items = [
    { id: 'help', label: '도움말', icon: FiHelpCircle, onClick: () => window.alert(HELP_MESSAGE) },
    { id: 'font-size', label: '글자크기', icon: FiType, onClick: handleFontSize },
    { id: 'zoom-in', label: '확대', icon: FiZoomIn, onClick: handleZoomIn },
    { id: 'zoom-out', label: '축소', icon: FiZoomOut, onClick: handleZoomOut },
    { id: 'scroll-top', label: '위로', icon: FiArrowUp, onClick: handleScrollTop },
    { id: 'scroll-bottom', label: '아래로', icon: FiArrowDown, onClick: handleScrollBottom },
    { id: 'comments', label: '댓글', icon: FiMessageSquare, onClick: handleScrollToComments },
    { id: 'print', label: '인쇄', icon: FiPrinter, onClick: handlePrint },
    { id: 'link', label: '링크', icon: FiLink, onClick: handleCopyLink },
  ]

  const renderButtons = (buttonClassName, iconClassName, labelClassName) =>
    items.map(({ id, label, icon: Icon, onClick }) => (
      <li key={id} className="post-utility-bar__item">
        <button type="button" className={buttonClassName} onClick={onClick}>
          <Icon className={iconClassName} aria-hidden="true" />
          <span className={labelClassName}>{label}</span>
        </button>
      </li>
    ))

  return (
    <>
      <aside ref={barRef} className="post-utility-bar post-utility-bar--desktop" aria-label="게시글 도구">
        <ul className="post-utility-bar__list">
          {renderButtons(
            'post-utility-bar__button',
            'post-utility-bar__icon',
            'post-utility-bar__label',
          )}
        </ul>
        {linkCopied && (
          <p className="post-utility-bar__toast" role="status">
            링크가 복사되었습니다.
          </p>
        )}
      </aside>

      <div ref={mobileRef} className="post-utility-mobile" aria-label="게시글 도구">
        {isMenuOpen && (
          <div className="post-utility-mobile__panel">
            <ul className="post-utility-bar__list post-utility-mobile__list">
              {renderButtons(
                'post-utility-bar__button',
                'post-utility-bar__icon',
                'post-utility-bar__label',
              )}
            </ul>
          </div>
        )}
        {linkCopied && isMobile && (
          <p className="post-utility-mobile__toast" role="status">
            링크가 복사되었습니다.
          </p>
        )}
        <button
          type="button"
          className={`post-utility-mobile__fab${isMenuOpen ? ' post-utility-mobile__fab--open' : ''}`}
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? '게시글 도구 닫기' : '게시글 도구 열기'}
          onClick={() => setIsMenuOpen((prev) => !prev)}
        >
          {isMenuOpen ? (
            <FiX className="post-utility-mobile__fab-icon" aria-hidden="true" />
          ) : (
            <FiPlus className="post-utility-mobile__fab-icon" aria-hidden="true" />
          )}
        </button>
      </div>
    </>
  )
}

export default PostUtilityBar
