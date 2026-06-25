import { useState } from 'react'
import { LOCATION_DATA, getMapLinks } from '@/data/location'
import './MapLinkBar.css'

const MAP_ACTIONS = [
  {
    id: 'naver',
    label: '네이버 지도에서 보기',
    href: () => getMapLinks().naver,
    icon: 'naver',
  },
  {
    id: 'kakao',
    label: '카카오맵에서 보기',
    href: () => getMapLinks().kakao,
    icon: 'kakao',
  },
]

function IconNaver() {
  return (
    <span className="map-link-bar__icon map-link-bar__icon--naver" aria-hidden="true">
      N
    </span>
  )
}

function IconKakao() {
  return (
    <span className="map-link-bar__icon map-link-bar__icon--kakao" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
          fill="#3182f6"
        />
        <circle cx="12" cy="10" r="2.5" fill="#fff" />
      </svg>
    </span>
  )
}

function IconCopy() {
  return (
    <span className="map-link-bar__icon map-link-bar__icon--copy" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="8" y="8" width="11" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    </span>
  )
}

const ICONS = {
  naver: IconNaver,
  kakao: IconKakao,
  copy: IconCopy,
}

function MapLinkBar() {
  const [copied, setCopied] = useState(false)

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(LOCATION_DATA.address)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('주소를 복사해 주세요.', LOCATION_DATA.address)
    }
  }

  return (
    <div className="map-link-bar" role="group" aria-label="지도 및 길찾기">
      {MAP_ACTIONS.map((action) => {
        const Icon = ICONS[action.icon]

        return (
          <a
            key={action.id}
            href={action.href()}
            className="map-link-bar__item"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon />
            <span className="map-link-bar__label">{action.label}</span>
          </a>
        )
      })}

      <button
        type="button"
        className="map-link-bar__item map-link-bar__item--copy"
        onClick={handleCopyAddress}
        aria-live="polite"
      >
        <IconCopy />
        <span className="map-link-bar__label">
          {copied ? '주소가 복사되었습니다' : '주소 복사하기'}
        </span>
      </button>
    </div>
  )
}

export default MapLinkBar
