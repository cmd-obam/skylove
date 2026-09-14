import { supabase } from '@/lib/supabase'
import {
  captureFirstTouchReferral,
  getCurrentPath,
  getOrCreateTrafficVisitorKey,
} from '@/utils/visitReferral'

const SESSION_KEY = 'skylove_analytics_session_v1'
const VISITOR_SEEN_KEY = 'skylove_analytics_seen_v1'
const SESSION_TIMEOUT_MS = 30 * 60 * 1000
const HEARTBEAT_MS = 15_000
const FLUSH_MS = 12_000

const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|wget|curl|python-requests|semrush|ahrefs/i

let started = false
let session = null
let currentPageview = null
let pendingPageviews = new Map()
let pendingEvents = []
let flushTimer = null
let heartbeatTimer = null
let lastActiveAt = Date.now()
let visibleAccumStartedAt = null

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function readJson(storage, key) {
  try {
    const raw = storage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

function isBot() {
  if (typeof navigator === 'undefined') return true
  if (navigator.webdriver) return true
  return BOT_UA.test(navigator.userAgent || '')
}

function detectDevice() {
  const ua = navigator.userAgent || ''
  const width = window.innerWidth || 0
  let device_type = 'desktop'
  if (/iPad|Tablet/i.test(ua) || (width >= 768 && width <= 1024 && /Mobile/i.test(ua))) {
    device_type = 'tablet'
  } else if (/Mobi|Android|iPhone|iPod/i.test(ua) || width < 768) {
    device_type = 'mobile'
  }

  let os_name = 'unknown'
  if (/Windows/i.test(ua)) os_name = 'Windows'
  else if (/Android/i.test(ua)) os_name = 'Android'
  else if (/iPhone|iPad|iPod/i.test(ua)) os_name = 'iOS'
  else if (/Mac OS X/i.test(ua)) os_name = 'macOS'
  else if (/Linux/i.test(ua)) os_name = 'Linux'

  let browser_name = 'unknown'
  if (/Edg\//i.test(ua)) browser_name = 'Edge'
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser_name = 'Chrome'
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser_name = 'Safari'
  else if (/Firefox\//i.test(ua)) browser_name = 'Firefox'
  else if (/SamsungBrowser/i.test(ua)) browser_name = 'Samsung Internet'

  return {
    device_type,
    os_name,
    browser_name,
    viewport_w: window.innerWidth || null,
    viewport_h: window.innerHeight || null,
    device_pixel_ratio: window.devicePixelRatio || null,
  }
}

function classifyAnalyticsReferral(touch) {
  const source = String(touch?.referral_source || '').toLowerCase()
  if (source && source !== 'unknown' && source !== 'other') {
    return source
  }

  const raw = String(touch?.referral_raw || '')
  try {
    if (!raw) return 'direct'
    const host = new URL(raw).hostname.toLowerCase()
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube'
    if (host.includes('bing.com')) return 'bing'
    if (host.includes(window.location.hostname)) return 'direct'
    return source || 'other'
  } catch {
    return source || 'unknown'
  }
}

function getReferralHost(raw) {
  try {
    if (!raw) return ''
    return new URL(raw).hostname.toLowerCase().slice(0, 120)
  } catch {
    return ''
  }
}

function isNewVisitor(visitorId) {
  const seen = readJson(window.localStorage, VISITOR_SEEN_KEY) || {}
  if (seen[visitorId]) return false
  seen[visitorId] = new Date().toISOString()
  writeJson(window.localStorage, VISITOR_SEEN_KEY, seen)
  return true
}

function parsePostMeta(pathname) {
  const worship = pathname.match(
    /^\/worship-word\/(sunday|el-shaddai)\/([0-9a-f-]{36})/i,
  )
  if (worship) {
    return {
      post_type: worship[1] === 'sunday' ? 'sunday_sermon' : 'el_shaddai_choir',
      post_id: worship[2],
    }
  }

  const news = pathname.match(/^\/church-news\/(?:album\/)?([0-9a-f-]{36})/i)
  if (news) {
    return { post_type: 'church_news', post_id: news[1] }
  }

  const pastor = pathname.match(/^\/pastor-story\/([0-9a-f-]{36})/i)
  if (pastor) {
    return { post_type: 'pastor_story', post_id: pastor[1] }
  }

  return { post_type: null, post_id: null }
}

function markVisibleClock(running) {
  if (running) {
    if (document.visibilityState === 'visible' && visibleAccumStartedAt == null) {
      visibleAccumStartedAt = Date.now()
    }
    return
  }

  if (visibleAccumStartedAt != null) {
    const delta = Date.now() - visibleAccumStartedAt
    if (currentPageview) {
      currentPageview.active_ms += delta
    }
    if (session) {
      session.active_ms += delta
    }
    visibleAccumStartedAt = null
  }
}

function ensureSession() {
  const visitorId = getOrCreateTrafficVisitorKey()
  if (!visitorId) return null

  const existing = readJson(window.sessionStorage, SESSION_KEY)
  const now = Date.now()
  if (
    existing?.id &&
    existing?.visitor_id === visitorId &&
    now - (existing.last_activity_at || 0) < SESSION_TIMEOUT_MS
  ) {
    session = {
      ...existing,
      last_activity_at: now,
    }
    writeJson(window.sessionStorage, SESSION_KEY, session)
    return session
  }

  const touch = getFirstTouchReferralSafe()
  const device = detectDevice()
  session = {
    id: createId(),
    visitor_id: visitorId,
    started_at: new Date().toISOString(),
    ended_at: null,
    active_ms: 0,
    pageview_count: 0,
    is_new_visitor: isNewVisitor(visitorId),
    landing_path: touch?.landing_path || getCurrentPath(),
    exit_path: getCurrentPath(),
    referral_source: classifyAnalyticsReferral(touch),
    referral_raw: touch?.referral_raw || '',
    referral_host: getReferralHost(touch?.referral_raw),
    utm_source: touch?.utm_source || '',
    utm_medium: touch?.utm_medium || '',
    utm_campaign: touch?.utm_campaign || '',
    utm_content: touch?.utm_content || '',
    utm_term: touch?.utm_term || '',
    ...device,
    last_activity_at: now,
    auth_member: null,
  }
  writeJson(window.sessionStorage, SESSION_KEY, session)
  return session
}

/**
 * Login/logout 시 세션을 분리한다.
 * - 로그인: 이후 활동을 회원 세션으로 기록
 * - 로그아웃: 이후 활동을 비회원 세션으로 기록
 * 기존 세션 행은 덮어쓰지 않고 새 session id 로 시작한다.
 */
export function syncAnalyticsAuthState(isLoggedIn) {
  if (!started || isBot() || typeof window === 'undefined') {
    return
  }

  const nextFlag = Boolean(isLoggedIn)
  ensureSession()
  if (!session) {
    return
  }

  if (session.auth_member == null) {
    session.auth_member = nextFlag
    writeJson(window.sessionStorage, SESSION_KEY, session)
    scheduleFlush()
    return
  }

  if (session.auth_member === nextFlag) {
    return
  }

  markVisibleClock(false)
  closeCurrentPageview()
  void flush({ keepalive: true })

  try {
    window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
  session = null
  currentPageview = null
  pendingPageviews = new Map()

  ensureSession()
  if (session) {
    session.auth_member = nextFlag
    writeJson(window.sessionStorage, SESSION_KEY, session)
  }
  openPageview()
  scheduleFlush()
}

function getFirstTouchReferralSafe() {
  try {
    return captureFirstTouchReferral()
  } catch {
    return null
  }
}

function closeCurrentPageview() {
  markVisibleClock(false)
  if (!currentPageview || !session) return

  currentPageview.exited_at = new Date().toISOString()
  pendingPageviews.set(currentPageview.id, { ...currentPageview })
  session.exit_path = currentPageview.path
  session.ended_at = currentPageview.exited_at
  session.last_activity_at = Date.now()
  writeJson(window.sessionStorage, SESSION_KEY, session)
  currentPageview = null
}

function openPageview() {
  if (!session) return
  markVisibleClock(false)

  const path = getCurrentPath()
  const meta = parsePostMeta(window.location.pathname)
  currentPageview = {
    id: createId(),
    session_id: session.id,
    path,
    title: (document.title || '').slice(0, 200),
    post_type: meta.post_type,
    post_id: meta.post_id,
    entered_at: new Date().toISOString(),
    exited_at: null,
    active_ms: 0,
    scroll_depth: 0,
    reached: {},
  }
  session.pageview_count += 1
  session.exit_path = path
  session.last_activity_at = Date.now()
  writeJson(window.sessionStorage, SESSION_KEY, session)
  pendingPageviews.set(currentPageview.id, { ...currentPageview })
  markVisibleClock(true)
  scheduleFlush()
}

async function flush({ keepalive = false } = {}) {
  if (!session) return

  markVisibleClock(false)
  markVisibleClock(true)

  const pageviews = [...pendingPageviews.values()].map((item) => ({
    id: item.id,
    session_id: item.session_id,
    path: item.path,
    title: item.title,
    post_type: item.post_type,
    post_id: item.post_id,
    entered_at: item.entered_at,
    exited_at: item.exited_at,
    active_ms: Math.round(item.active_ms || 0),
    scroll_depth: item.scroll_depth || 0,
  }))

  const events = pendingEvents.splice(0, pendingEvents.length)
  if (currentPageview) {
    pendingPageviews.set(currentPageview.id, { ...currentPageview })
  }

  const payload = {
    visitor_id: session.visitor_id,
    session: {
      id: session.id,
      started_at: session.started_at,
      ended_at: session.ended_at,
      active_ms: Math.round(session.active_ms || 0),
      pageview_count: session.pageview_count,
      is_new_visitor: session.is_new_visitor,
      landing_path: session.landing_path,
      exit_path: session.exit_path,
      referral_source: session.referral_source,
      referral_raw: session.referral_raw,
      referral_host: session.referral_host,
      utm_source: session.utm_source,
      utm_medium: session.utm_medium,
      utm_campaign: session.utm_campaign,
      utm_content: session.utm_content,
      utm_term: session.utm_term,
      device_type: session.device_type,
      os_name: session.os_name,
      browser_name: session.browser_name,
      viewport_w: session.viewport_w,
      viewport_h: session.viewport_h,
      device_pixel_ratio: session.device_pixel_ratio,
    },
    pageviews,
    events,
  }

  try {
    const { error } = await supabase.rpc('ingest_site_analytics', {
      p_payload: payload,
    })
    if (error) {
      if (events.length) {
        pendingEvents.unshift(...events)
      }
      console.warn('[Analytics] ingest failed', error.message)
      return
    }
    // Keep current pageview in pending for future active_ms updates
    pendingPageviews = new Map()
    if (currentPageview) {
      pendingPageviews.set(currentPageview.id, { ...currentPageview })
    }
  } catch (error) {
    if (events.length) {
      pendingEvents.unshift(...events)
    }
    if (!keepalive) {
      console.warn('[Analytics] ingest threw', error)
    }
  }
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = window.setTimeout(() => {
    flushTimer = null
    void flush()
  }, FLUSH_MS)
}

function trackEvent(eventName, payload = {}) {
  if (!session) return
  pendingEvents.push({
    id: createId(),
    session_id: session.id,
    event_name: eventName,
    path: getCurrentPath(),
    payload,
    created_at: new Date().toISOString(),
  })
  scheduleFlush()
}

function updateScrollDepth() {
  if (!currentPageview) return
  const doc = document.documentElement
  const scrollTop = window.scrollY || doc.scrollTop || 0
  const height = Math.max(doc.scrollHeight - window.innerHeight, 1)
  const percent = Math.min(100, Math.round((scrollTop / height) * 100))
  if (percent <= currentPageview.scroll_depth) return

  currentPageview.scroll_depth = percent
  const milestones = [25, 50, 75, 90, 100]
  for (const mark of milestones) {
    if (percent >= mark && !currentPageview.reached[mark]) {
      currentPageview.reached[mark] = true
      trackEvent('scroll_depth', { depth: mark, path: currentPageview.path })
    }
  }
  pendingPageviews.set(currentPageview.id, { ...currentPageview })
}

function resolveCtaLabel(target) {
  const el =
    target?.closest?.(
      'a, button, [data-analytics-cta], .worship-word-detail__video-poster',
    ) || null
  if (!el) return null

  if (el.matches('.worship-word-detail__video-poster')) {
    return { name: 'worship_play', label: '예배말씀 재생' }
  }

  const explicit = el.getAttribute?.('data-analytics-cta')
  if (explicit) {
    return { name: 'cta_click', label: explicit }
  }

  const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
  const href = el.getAttribute?.('href') || ''
  const labels = [
    '처음오신분을 환영합니다',
    '예배 안내 보기',
    '교회소개',
    '예배안내',
    '예배말씀',
    '교회소식',
    '새가족 안내',
    '자세히 보기',
    '찾아오시는 길',
    'GALLERY',
  ]
  const matched = labels.find((label) => text.includes(label))
  if (matched) {
    return { name: 'cta_click', label: matched }
  }

  if (href.startsWith('http') && !href.includes(window.location.hostname)) {
    return {
      name: 'external_click',
      label: '외부 링크',
      href: href.slice(0, 300),
    }
  }

  if (el.tagName === 'A' && href.startsWith('/')) {
    return { name: 'nav_click', label: text.slice(0, 80) || href }
  }

  return null
}

function onClick(event) {
  const info = resolveCtaLabel(event.target)
  if (!info) return
  trackEvent(info.name, {
    label: info.label,
    href: info.href || '',
  })
}

function onVisibility() {
  if (document.visibilityState === 'hidden') {
    markVisibleClock(false)
    void flush({ keepalive: true })
  } else {
    lastActiveAt = Date.now()
    markVisibleClock(true)
  }
}

function onPageShow() {
  ensureSession()
  if (!currentPageview) {
    openPageview()
  }
}

/**
 * Start detailed analytics tracking.
 * Does NOT touch footer TODAY/TOTAL or site_traffic_events.
 */
export function startSiteAnalytics() {
  if (typeof window === 'undefined' || started || isBot()) {
    return
  }
  started = true

  ensureSession()

  heartbeatTimer = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return
    markVisibleClock(false)
    markVisibleClock(true)
    lastActiveAt = Date.now()
    if (session) {
      session.last_activity_at = lastActiveAt
      writeJson(window.sessionStorage, SESSION_KEY, session)
    }
    scheduleFlush()
  }, HEARTBEAT_MS)

  window.addEventListener('scroll', updateScrollDepth, { passive: true })
  document.addEventListener('click', onClick, true)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', () => {
    markVisibleClock(false)
    void flush({ keepalive: true })
  })
  window.addEventListener('pageshow', onPageShow)

  scheduleFlush()
}

export function trackAnalyticsRouteChange() {
  if (!started || isBot()) return
  ensureSession()
  closeCurrentPageview()
  openPageview()
  scheduleFlush()
}

export function trackAnalyticsSearch({ query, resultCount = null }) {
  if (!started || isBot()) return
  const cleaned = String(query || '').trim().slice(0, 80)
  if (!cleaned) return
  trackEvent('search', {
    label: '검색',
    query: cleaned,
    result_count: resultCount,
  })
}
