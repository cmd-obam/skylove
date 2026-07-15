import { useEffect, useMemo, useRef } from 'react'
import './KakaoRoughMap.css'

const MAP_CONFIG = {
  timestamp: '1782224245823',
  key: 'q2di2932duo',
}

function waitForLander(interval = 100, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()

    const check = () => {
      if (window.daum?.roughmap?.Lander) {
        resolve()
        return
      }

      if (Date.now() - startedAt >= timeout) {
        reject(new Error('Kakao roughmap load timeout'))
        return
      }

      setTimeout(check, interval)
    }

    check()
  })
}

function waitForContainerWidth(container) {
  return new Promise((resolve) => {
    const check = () => {
      if (container.clientWidth > 0) {
        resolve()
        return
      }

      requestAnimationFrame(check)
    }

    check()
  })
}

function hideExtraMapInfo(container) {
  const selectors = [
    '.border1',
    '.wrap_controllers',
    '.section_address',
    '.section_tel',
    '.section_phone',
    '.cont_address',
    '.cont_tel',
    '.cont_phone',
    '.info_bus',
    '.info_station',
    '.map_address',
    '.wrap_btn_address',
    '.wrap_address',
    '.tit_address',
    '.txt_address',
    '.wrap_tel',
    '.tit_tel',
    '.txt_tel',
  ]

  selectors.forEach((selector) => {
    container.querySelectorAll(selector).forEach((node) => {
      node.style.setProperty('display', 'none', 'important')
    })
  })

  container.querySelectorAll('tr, dl, li, p, dt, dd, th, td, div, span').forEach((node) => {
    if (node.closest('.wrap_map') || node.querySelector('iframe, .wrap_map')) {
      return
    }

    const text = node.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    if (
      (text.startsWith('주소') || text.startsWith('전화') || text.includes('주소') && text.length < 80) &&
      text.length < 120
    ) {
      // Hide the row/container that shows Kakao's address/phone block
      const row = node.closest('tr, dl, li, .wrap_controllers, .border1') ?? node
      row.style.setProperty('display', 'none', 'important')
    }
  })
}

function KakaoRoughMap({ height = 360, hideInfoHeader = false }) {
  const containerRef = useRef(null)
  const containerId = useMemo(() => `daumRoughmapContainer${MAP_CONFIG.timestamp}`, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return undefined
    }

    let cancelled = false
    let infoObserver = null

    const renderMap = async () => {
      try {
        await waitForLander()
        await waitForContainerWidth(container)

        if (cancelled) {
          return
        }

        container.innerHTML = ''

        const mapWidth = container.clientWidth || 640

        new window.daum.roughmap.Lander({
          timestamp: MAP_CONFIG.timestamp,
          key: MAP_CONFIG.key,
          mapWidth: String(mapWidth),
          mapHeight: String(height),
        }).render()

        if (hideInfoHeader) {
          const applyHide = () => hideExtraMapInfo(container)
          applyHide()
          infoObserver = new MutationObserver(applyHide)
          infoObserver.observe(container, { childList: true, subtree: true })
        }
      } catch {
        // Keep the container empty when the map cannot be initialized.
      }
    }

    renderMap()

    return () => {
      cancelled = true
      infoObserver?.disconnect()
    }
  }, [containerId, height, hideInfoHeader])

  return (
    <div
      id={containerId}
      ref={containerRef}
      className={`kakao-roughmap root_daum_roughmap root_daum_roughmap_landing${
        hideInfoHeader ? ' kakao-roughmap--compact' : ''
      }`}
      style={{ width: '100%', minHeight: height }}
      aria-label="하늘사랑교회 카카오 지도"
    />
  )
}

export default KakaoRoughMap
