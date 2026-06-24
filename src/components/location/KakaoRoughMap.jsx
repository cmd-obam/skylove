import { useEffect, useRef } from 'react'
import './KakaoRoughMap.css'

const MAP_CONTAINER_ID = 'daumRoughmapContainer1782224245823'
const MAP_CONFIG = {
  timestamp: '1782224245823',
  key: 'q2di2932duo',
}
const ROUGHMAP_LANDER_SCRIPT_ID = 'daum-roughmap-lander-script'

function waitFor(predicate, interval = 100, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()

    const check = () => {
      if (predicate()) {
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

function ensureRoughmapLander() {
  if (window.daum?.roughmap?.Lander) {
    return Promise.resolve()
  }

  if (!window.daum?.roughmap?.cdn) {
    const protocol = location.protocol === 'https:' ? 'https:' : 'http:'
    const cdn = '207038f2_1774248312945'
    const phase = 'prod'

    window.daum = window.daum || {}
    window.daum.roughmap = {
      phase,
      cdn,
      URL_KEY_DATA_LOAD_PRE: `${protocol}//t1.kakaocdn.net/roughmap/`,
      url_protocal: protocol,
      url_cdn_domain: '//t1.kakaocdn.net',
    }

    if (!document.getElementById(ROUGHMAP_LANDER_SCRIPT_ID)) {
      const script = document.createElement('script')
      script.id = ROUGHMAP_LANDER_SCRIPT_ID
      script.charset = 'UTF-8'
      script.src = `${protocol}//t1.kakaocdn.net/kakaomapweb/roughmap/place/${phase}/${cdn}/roughmapLander.js`
      document.head.appendChild(script)
    }
  }

  return waitFor(() => Boolean(window.daum?.roughmap?.Lander))
}

function waitForContainerSize(container) {
  return new Promise((resolve) => {
    const check = () => {
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        resolve()
        return
      }

      requestAnimationFrame(check)
    }

    check()
  })
}

function renderRoughmap(mapWidth, mapHeight) {
  if (!window.daum?.roughmap?.Lander) {
    return
  }

  new window.daum.roughmap.Lander({
    timestamp: MAP_CONFIG.timestamp,
    key: MAP_CONFIG.key,
    mapWidth: String(mapWidth),
    mapHeight: String(mapHeight),
  }).render()
}

function KakaoRoughMap() {
  const containerRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const initMap = async () => {
      const container = containerRef.current
      if (!container || cancelled) {
        return
      }

      try {
        await ensureRoughmapLander()
        await waitForContainerSize(container)

        if (cancelled) {
          return
        }

        container.innerHTML = ''

        const mapWidth = container.clientWidth || 640
        const mapHeight = container.clientHeight || 420
        renderRoughmap(mapWidth, mapHeight)
      } catch {
        // Keep the container empty when the map cannot be initialized.
      }
    }

    initMap()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div
      id={MAP_CONTAINER_ID}
      ref={containerRef}
      className="kakao-roughmap root_daum_roughmap root_daum_roughmap_landing"
      style={{ width: '100%' }}
      aria-label="하늘사랑교회 카카오 지도"
    />
  )
}

export default KakaoRoughMap
