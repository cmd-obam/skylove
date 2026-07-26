/**
 * Diagnose signup RPCs + send OTP via sendEmailVerification path + wait for mail.
 *
 *   npx vite-node scripts/test-signup-otp-email.mjs
 */
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_KEY

function installBrowserGlobals() {
  const memory = new Map()
  const sessionMemory = new Map()
  const storage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key),
    get length() {
      return memory.size
    },
    key: (index) => [...memory.keys()][index] ?? null,
  }
  const sessionStorage = {
    getItem: (key) => (sessionMemory.has(key) ? sessionMemory.get(key) : null),
    setItem: (key, value) => sessionMemory.set(key, String(value)),
    removeItem: (key) => sessionMemory.delete(key),
    get length() {
      return sessionMemory.size
    },
    key: (index) => [...sessionMemory.keys()][index] ?? null,
  }

  globalThis.window = {
    location: {
      href: 'https://www.hlckm.co.kr/signup',
      origin: 'https://www.hlckm.co.kr',
      pathname: '/signup',
      search: '',
      hash: '',
    },
    localStorage: storage,
    sessionStorage,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  }
  globalThis.localStorage = storage
  globalThis.sessionStorage = sessionStorage
}

async function pollMailinator(inbox, timeoutMs = 90000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const res = await fetch(
      `https://www.mailinator.com/api/v2/domains/public/inboxes/${encodeURIComponent(inbox)}`,
    )
    if (res.ok) {
      const json = await res.json()
      const msgs = json.msgs || []
      if (msgs.length > 0) {
        return msgs[0]
      }
    }
    await new Promise((r) => setTimeout(r, 2500))
    process.stdout.write('.')
  }
  return null
}

async function probeRpc(name, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  return { name, status: res.status, body: text.slice(0, 180) }
}

async function main() {
  console.log('=== 1) Live RPC probe ===')
  const rpcResults = []
  rpcResults.push(await probeRpc('is_username_available', { check_username: 'probe_user' }))
  rpcResults.push(await probeRpc('username_available', { check_username: 'probe_user' }))
  rpcResults.push(await probeRpc('check_username', { check_username: 'probe_user' }))
  rpcResults.push(
    await probeRpc('find_username_by_name_email', {
      p_name: '테스트',
      p_email: 'probe@example.com',
    }),
  )
  console.log(JSON.stringify(rpcResults, null, 2))

  installBrowserGlobals()

  const { checkDuplicateId, sendEmailVerification } = await import(
    '../src/services/auth/signup.js'
  )

  console.log('\n=== 2) checkDuplicateId (should use profiles table, no hard fail) ===')
  const idResult = await checkDuplicateId(`probe_${Date.now().toString(36)}`)
  console.log(idResult)

  const inbox = `signup-otp-${Date.now().toString(36)}`
  const email = `${inbox}@mailinator.com`

  console.log('\n=== 3) sendEmailVerification → OTP ===')
  console.log('email:', email)
  const sendResult = await sendEmailVerification(email, { source: 'signup-email-verify' })
  console.log('sendResult:', sendResult)

  if (!sendResult.success) {
    throw new Error(`OTP send failed: ${sendResult.message}`)
  }

  console.log('\n=== 4) Wait for mailbox ===')
  const mail = await pollMailinator(inbox)
  if (!mail) {
    throw new Error('Authentication email did not arrive')
  }

  console.log('\nMAIL ARRIVED:', { subject: mail.subject, from: mail.from })
  console.log('\n=== SUMMARY ===')
  console.log(
    JSON.stringify(
      {
        rpc: Object.fromEntries(rpcResults.map((r) => [r.name, r.status])),
        idCheckSource: idResult.source,
        otpSendSuccess: sendResult.success,
        mailArrived: true,
        mailSubject: mail.subject,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error('TEST FAILED', error)
  process.exit(1)
})
