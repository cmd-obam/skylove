import { buildTrustedVisitPayload } from './trustedClientIp.js'

function parseBody(body) {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch {
      return {}
    }
  }
  return body
}

function readEnv(name, fallbackName) {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : '') || ''
}

function bearerToken(header) {
  const value = String(header || '')
  const match = value.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : ''
}

function recorderConfig() {
  const supabaseUrl = readEnv('SUPABASE_URL', 'VITE_SUPABASE_URL').replace(/\/$/, '')
  const anonKey = readEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY')
  const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY', '')
  const missing = []

  if (!supabaseUrl) missing.push('SUPABASE_URL')
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  return {
    supabaseUrl,
    anonKey,
    serviceKey,
    ready: missing.length === 0,
    reason: missing.length === 0 ? null : 'server_key_missing',
    missing,
  }
}

async function verifiedUserId(supabaseUrl, anonKey, token) {
  if (!token || !supabaseUrl || !anonKey) return null

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) return null

  const user = await response.json().catch(() => null)
  return typeof user?.id === 'string' ? user.id : null
}

async function recordVisit({ supabaseUrl, serviceKey, payload, userId }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/record_trusted_ip_visit`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_ip: payload.ip,
      p_path: payload.path,
      p_referral_source: payload.referralSource,
      p_referral_raw: payload.referralRaw,
      p_user_id: userId,
    }),
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    console.error('[record-ip-visit] rpc_rejected', {
      status: response.status,
      body,
    })
    return { recorded: false, reason: 'rpc_rejected' }
  }

  return body && typeof body === 'object' ? body : { recorded: false, reason: 'empty_response' }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const config = recorderConfig()
    res.status(200).json({
      ready: config.ready,
      reason: config.reason,
      // Never return the key. Only tell the admin which server env names are missing.
      missing: config.missing,
    })
    return
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    res.status(405).json({ recorded: false, reason: 'method_not_allowed' })
    return
  }

  const payload = buildTrustedVisitPayload(req.headers, parseBody(req.body))
  if (!payload.ip) {
    console.error('[record-ip-visit] ip_unavailable', {
      hasRealIp: Boolean(req.headers?.['x-real-ip'] || req.headers?.['x-vercel-forwarded-for']),
      path: payload.path,
    })
    res.status(200).json({ recorded: false, reason: 'ip_unavailable' })
    return
  }

  const config = recorderConfig()
  if (!config.ready) {
    console.error('[record-ip-visit] server_key_missing', {
      missing: config.missing,
      path: payload.path,
    })
    res.status(200).json({ recorded: false, reason: 'server_key_missing', missing: config.missing })
    return
  }

  try {
    const userId = await verifiedUserId(
      config.supabaseUrl,
      config.anonKey,
      bearerToken(req.headers.authorization),
    )
    const result = await recordVisit({
      supabaseUrl: config.supabaseUrl,
      serviceKey: config.serviceKey,
      payload,
      userId,
    })

    if (!result.recorded) {
      console.error('[record-ip-visit] not_recorded', {
        reason: result.reason || null,
        path: payload.path,
      })
    }

    res.status(200).json({
      recorded: Boolean(result.recorded),
      reason: result.reason || null,
    })
  } catch (error) {
    console.error('[record-ip-visit] record_failed', error)
    res.status(200).json({ recorded: false, reason: 'record_failed' })
  }
}
