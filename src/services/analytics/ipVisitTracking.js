import { supabase } from '@/lib/supabase'
import { getFirstTouchReferral } from '@/utils/visitReferral'

const DEDUPE_MS = 10 * 60 * 1000
const RETRY_MS = 60 * 1000

function storageKey(path, userId) {
  return `ip-visit:${userId || 'guest'}:${path}`
}

function readStamp(key) {
  try {
    return Number(window.sessionStorage.getItem(key) || 0)
  } catch {
    return 0
  }
}

function writeStamp(key, value) {
  try {
    window.sessionStorage.setItem(key, String(value))
  } catch {
    // Private mode can block storage. The server still dedupes.
  }
}

export async function recordIpVisitPage({ user = null } = {}) {
  if (typeof window === 'undefined') {
    return { recorded: false }
  }

  const path = window.location.pathname || '/'
  const key = storageKey(path, user?.id)
  const previous = readStamp(key)
  if (previous && Date.now() - previous < DEDUPE_MS) {
    return { recorded: false, skipped: true }
  }

  const touch = getFirstTouchReferral() || {}
  let token = ''

  try {
    const { data } = await supabase.auth.getSession()
    token = data.session?.access_token || ''
  } catch {
    token = ''
  }

  try {
    const response = await fetch('/api/record-ip-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        path,
        referral_source: touch.referral_source || '',
        referral_raw: touch.referral_raw || '',
      }),
    })

    const body = await response.json().catch(() => null)
    if (!response.ok || !body?.recorded) {
      writeStamp(key, Date.now() - DEDUPE_MS + RETRY_MS)
      return { recorded: false, reason: body?.reason || 'not_recorded' }
    }

    writeStamp(key, Date.now())
    return { recorded: true }
  } catch {
    writeStamp(key, Date.now() - DEDUPE_MS + RETRY_MS)
    return { recorded: false, reason: 'network' }
  }
}
