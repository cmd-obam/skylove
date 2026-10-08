import { useCallback, useEffect, useState } from 'react'
import {
  THANKSGIVING_POPUP,
  hideHomeEventPopupForToday,
  shouldShowHomeEventPopup,
} from '@/data/homeEventPopup'
import thanksgivingPopupImage from '@/assets/images/home/thanksgiving-popup.png'
import './HomeEventPopup.css'

function HomeEventPopup({ config = THANKSGIVING_POPUP }) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setIsOpen(shouldShowHomeEventPopup(config))
  }, [config])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const hideForToday = useCallback(() => {
    hideHomeEventPopupForToday(config)
    setIsOpen(false)
  }, [config])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        close()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, close])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="home-event-popup"
      role="presentation"
      onClick={close}
    >
      <div
        className="home-event-popup__dialog"
        role="dialog"
        aria-modal="true"
        aria-label={config.imageAlt}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="home-event-popup__close-icon"
          aria-label="닫기"
          onClick={close}
        >
          &times;
        </button>

        <div className="home-event-popup__image-wrap">
          <img
            className="home-event-popup__image"
            src={thanksgivingPopupImage}
            alt={config.imageAlt}
            draggable={false}
          />
        </div>

        <div className="home-event-popup__actions">
          <button
            type="button"
            className="home-event-popup__btn home-event-popup__btn--ghost"
            onClick={hideForToday}
          >
            오늘 하루 보지 않기
          </button>
          <button
            type="button"
            className="home-event-popup__btn home-event-popup__btn--primary"
            onClick={close}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

export default HomeEventPopup
