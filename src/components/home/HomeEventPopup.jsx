import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  THANKSGIVING_POPUP,
  hideHomeEventPopupForToday,
  shouldShowHomeEventPopup,
} from '@/data/homeEventPopup'
import { THANKSGIVING_GAME_SUPER_ADMIN_ONLY } from '@/data/eventMenu'
import { useSuperAdmin } from '@/hooks/useSuperAdmin'
import thanksgivingPopupImage from '@/assets/images/home/thanksgiving-popup.png'
import './HomeEventPopup.css'

function HomeEventPopup({ config = THANKSGIVING_POPUP }) {
  const { isSuperAdmin } = useSuperAdmin()
  const canOpenGame =
    Boolean(config.gamePath) &&
    (!THANKSGIVING_GAME_SUPER_ADMIN_ONLY || isSuperAdmin)
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
    <div className="home-event-popup" role="presentation" onClick={close}>
      <div
        className="home-event-popup__panel"
        role="dialog"
        aria-modal="true"
        aria-label={config.imageAlt}
        onClick={(event) => event.stopPropagation()}
      >
        <figure className="home-event-popup__figure">
          <img
            className="home-event-popup__image"
            src={thanksgivingPopupImage}
            alt={config.imageAlt}
            draggable={false}
          />
        </figure>

        {canOpenGame ? (
          <div className="home-event-popup__cta-wrap">
            <Link
              to={config.gamePath}
              className="home-event-popup__cta"
              onClick={close}
            >
              {config.gameCtaLabel ?? '미니게임 시작하기'}
            </Link>
          </div>
        ) : null}

        <div className="home-event-popup__footer">
          <button
            type="button"
            className="home-event-popup__link"
            onClick={hideForToday}
          >
            오늘 하루 보지 않기
          </button>
          <span className="home-event-popup__divider" aria-hidden="true" />
          <button
            type="button"
            className="home-event-popup__link home-event-popup__link--emphasis"
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
