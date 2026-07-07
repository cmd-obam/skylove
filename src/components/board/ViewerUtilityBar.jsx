import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FiArrowDown,
  FiArrowUp,
  FiHelpCircle,
  FiLink,
  FiPlus,
  FiPrinter,
  FiType,
  FiX,
  FiZoomIn,
  FiZoomOut,
} from 'react-icons/fi'
import '@/components/board/PostUtilityBar.css'
import './ViewerUtilityBar.css'

const PAPER_SELECTOR = '.board-post-viewer-paper'
const BOUNDARY_SELECTOR = '.board-post-viewer-page'
const MOBILE_BREAKPOINT = 1024
const MIN_FONT_SCALE = 0.85
const MAX_FONT_SCALE = 1.5
const FONT_SCALE_STEP = 0.1
const MIN_IMAGE_ZOOM = 0.8
const MAX_IMAGE_ZOOM = 1.5
const IMAGE_ZOOM_STEP = 0.1
const POSITION_PADDING = 12
const MOBILE_EDGE_GAP = 16

const HELP_MESSAGE =
  '도움말: 글자 확대·축소로 본문 글자 크기를, 이미지 확대·축소로 사진 크기를 조절할 수 있습니다. 맨 위·맨 아래로 이동하고, 인쇄 및 링크 복사도 이용할 수 있습니다.'

function ViewerUtilityBar() {
  const barRef = useRef(null)
  const mobileRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [fontScale, setFontScale] = useState(1)
  const [imageZoom, setImageZoom] = useState(1)
  const [linkCopied, setLinkCopied] = useState(false)

  const getPaperElement = useCallback(() => document.querySelector(PAPER_SELECTOR), [])

  const updateDesktopPosition = useCallback(() => {
    const bar = barRef.current

    if (!bar) {
      return
    }

    const barHeight = bar.offsetHeight
    const top = Math.max(POSITION_PADDING, window.innerHeight * 0.5 - barHeight * 0.5)

    bar.style.visibility = 'visible'
    bar.style.top = `${top}px`
  }, [])

  const updateMobilePosition = useCallback(() => {
    const mobile = mobileRef.current

    if (!mobile) {
      return
    }

    mobile.style.visibility = 'visible'
    mobile.style.bottom = `${MOBILE_EDGE_GAP}px`
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
    const paper = getPaperElement()
    if (!paper) {
      return undefined
    }

    paper.style.setProperty('--viewer-font-scale', String(fontScale))
    paper.style.setProperty('--viewer-image-zoom', String(imageZoom))

    return () => {
      paper.style.removeProperty('--viewer-font-scale')
      paper.style.removeProperty('--viewer-image-zoom')
    }
  }, [fontScale, getPaperElement, imageZoom])

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

  const handleFontZoomIn = () => {
    setFontScale((prev) => Math.min(MAX_FONT_SCALE, Number((prev + FONT_SCALE_STEP).toFixed(2))))
  }

  const handleFontZoomOut = () => {
    setFontScale((prev) => Math.max(MIN_FONT_SCALE, Number((prev - FONT_SCALE_STEP).toFixed(2))))
  }

  const handleImageZoomIn = () => {
    setImageZoom((prev) => Math.min(MAX_IMAGE_ZOOM, Number((prev + IMAGE_ZOOM_STEP).toFixed(1))))
  }

  const handleImageZoomOut = () => {
    setImageZoom((prev) => Math.max(MIN_IMAGE_ZOOM, Number((prev - IMAGE_ZOOM_STEP).toFixed(1))))
  }

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleScrollBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
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
    { id: 'font-in', label: '글자확대', icon: FiType, onClick: handleFontZoomIn },
    { id: 'font-out', label: '글자축소', icon: FiType, onClick: handleFontZoomOut },
    { id: 'image-in', label: '이미지확대', icon: FiZoomIn, onClick: handleImageZoomIn },
    { id: 'image-out', label: '이미지축소', icon: FiZoomOut, onClick: handleImageZoomOut },
    { id: 'scroll-top', label: '맨위', icon: FiArrowUp, onClick: handleScrollTop },
    { id: 'scroll-bottom', label: '맨아래', icon: FiArrowDown, onClick: handleScrollBottom },
    { id: 'print', label: '인쇄', icon: FiPrinter, onClick: handlePrint },
    { id: 'link', label: '링크복사', icon: FiLink, onClick: handleCopyLink },
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
      <aside
        ref={barRef}
        className="post-utility-bar post-utility-bar--desktop viewer-utility-bar"
        aria-label="뷰어 도구"
      >
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

      <div ref={mobileRef} className="post-utility-mobile viewer-utility-mobile" aria-label="뷰어 도구">
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
          aria-label={isMenuOpen ? '뷰어 도구 닫기' : '뷰어 도구 열기'}
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

export default ViewerUtilityBar
