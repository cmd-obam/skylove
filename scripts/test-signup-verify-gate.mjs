/**
 * Ensures signup UI cannot mark email verified without AuthCallback beacon.
 *
 *   npx vite-node scripts/test-signup-verify-gate.mjs
 */

function installBrowserGlobals() {
  const memory = new Map()
  const sessionMemory = new Map()
  const storageApi = (store) => ({
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    get length() {
      return store.size
    },
    key: (index) => [...store.keys()][index] ?? null,
  })

  globalThis.window = {
    location: {
      href: 'https://www.hlckm.co.kr/signup',
      origin: 'https://www.hlckm.co.kr',
      pathname: '/signup',
      search: '',
      hash: '',
    },
    localStorage: storageApi(memory),
    sessionStorage: storageApi(sessionMemory),
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  }
  globalThis.localStorage = globalThis.window.localStorage
  globalThis.sessionStorage = globalThis.window.sessionStorage
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function main() {
  installBrowserGlobals()

  const { isEmailConfirmed } = await import('../src/services/auth/authCallbackSession.js')
  const { checkEmailVerificationStatus, sendEmailVerification } = await import(
    '../src/services/auth/signup.js'
  )

  assert(
    isEmailConfirmed({ email_confirmed_at: null, confirmed_at: '2026-01-01' }) === false,
    'confirmed_at alone must NOT count as verified',
  )
  assert(
    isEmailConfirmed({ email_confirmed_at: '2026-01-01T00:00:00Z' }) === true,
    'email_confirmed_at must count as verified',
  )

  const statusWithoutBeacon = await checkEmailVerificationStatus('gate-test@example.com')
  assert(statusWithoutBeacon.verified === false, 'without beacon must not be verified')
  assert(
    statusWithoutBeacon.reason === 'awaiting_email_link',
    `expected awaiting_email_link, got ${statusWithoutBeacon.reason}`,
  )

  const inbox = `gate-${Date.now().toString(36)}`
  const email = `${inbox}@mailinator.com`
  const sendResult = await sendEmailVerification(email, {
    password: `Test!${Date.now().toString(36)}Aa1`,
    source: 'signup-email-verify',
  })
  assert(sendResult.success === true, `signUp email send failed: ${sendResult.message}`)
  assert(sendResult.alreadyVerified !== true, 'must not short-circuit as alreadyVerified')

  const statusAfterSend = await checkEmailVerificationStatus(email)
  assert(statusAfterSend.verified === false, 'after signUp send still must not be verified')

  console.log(
    JSON.stringify(
      {
        confirmedAtBypassBlocked: true,
        withoutBeaconVerified: statusWithoutBeacon.verified,
        signupEmailSent: sendResult.success,
        afterSendVerified: statusAfterSend.verified,
      },
      null,
      2,
    ),
  )
  console.log('PASS: signup verify gate')
}

main().catch((error) => {
  console.error('FAILED', error)
  process.exit(1)
})
