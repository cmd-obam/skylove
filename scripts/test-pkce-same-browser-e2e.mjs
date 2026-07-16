/**
 * Same-browser PKCE signup → mail click → auth complete → profile signup.
 * Also asserts cross-browser missing-verifier messaging.
 *
 *   npx vite-node scripts/test-pkce-same-browser-e2e.mjs
 */
import { createClient } from '@supabase/supabase-js'
import {
  AUTH_CROSS_BROWSER_MESSAGE,
  isMissingPkceVerifierError,
  toAuthCallbackUserMessage,
} from '../src/services/auth/authErrors.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_KEY
const REDIRECT_TO = 'https://www.hlckm.co.kr/auth/callback'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase env')
  process.exit(1)
}

function createMemoryStorage(label) {
  const memory = new Map()
  return {
    label,
    memory,
    api: {
      getItem: (key) => (memory.has(key) ? memory.get(key) : null),
      setItem: (key, value) => memory.set(key, String(value)),
      removeItem: (key) => memory.delete(key),
    },
    hasVerifier: () => [...memory.keys()].some((key) => key.includes('code-verifier')),
    keys: () => [...memory.keys()],
  }
}

async function pollMailinator(inbox, timeoutMs = 90000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const listRes = await fetch(
      `https://www.mailinator.com/api/v2/domains/public/inboxes/${encodeURIComponent(inbox)}`,
    )
    if (listRes.ok) {
      const listJson = await listRes.json()
      const msgs = listJson.msgs || []
      if (msgs.length > 0) {
        const id = msgs[0].id
        const msgRes = await fetch(
          `https://www.mailinator.com/api/v2/domains/public/inboxes/${encodeURIComponent(inbox)}/messages/${id}`,
        )
        const msg = await msgRes.json()
        return (msg.parts || []).map((part) => part.body || '').join('\n')
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2500))
    process.stdout.write('.')
  }
  throw new Error('Mailinator timeout')
}

function extractVerifyUrl(body) {
  const match = body.match(
    /https:\/\/nwsytxwurnaxaabztomh\.supabase\.co\/auth\/v1\/verify[^\s"'<>\]]+/i,
  )
  if (!match) return null
  return match[0].replace(/&amp;/g, '&').replace(/[\]>).,;]+$/g, '')
}

async function followToCallback(verifyUrl) {
  let current = verifyUrl
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const parsed = new URL(current)
    if (
      parsed.hostname.includes('hlckm.co.kr') &&
      parsed.pathname.includes('/auth/callback')
    ) {
      return current
    }
    const response = await fetch(current, {
      redirect: 'manual',
      headers: { Accept: 'text/html' },
    })
    const location = response.headers.get('location')
    if (!location) {
      throw new Error(`No redirect status=${response.status}`)
    }
    current = new URL(location, current).href
  }
  throw new Error('Too many redirects')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function testCrossBrowserMessage() {
  console.log('\n=== Cross-browser message ===')
  const fakeError = {
    name: 'AuthPKCECodeVerifierMissingError',
    code: 'pkce_code_verifier_not_found',
    message: 'PKCE code verifier not found in storage.',
  }
  assert(isMissingPkceVerifierError(fakeError), 'should detect missing verifier')
  const message = toAuthCallbackUserMessage(fakeError)
  assert(message.includes(AUTH_CROSS_BROWSER_MESSAGE), `unexpected message: ${message}`)
  console.log('PASS:', AUTH_CROSS_BROWSER_MESSAGE)
}

async function testSameBrowserFullSignup() {
  console.log('\n=== Same Chrome profile: signup → mail → callback → complete ===')

  const shared = createMemoryStorage('CHROME_PROFILE')
  const stamp = Date.now().toString(36)
  const inbox = `pkce-same-${stamp}`
  const email = `${inbox}@mailinator.com`
  const loginId = `u${stamp}`.slice(0, 20)
  const password = `Test!${stamp}Aa1`

  // STEP 1: signup tab client (OTP send stores verifier)
  const signupClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      flowType: 'pkce',
      detectSessionInUrl: true,
      autoRefreshToken: false,
      storage: shared.api,
    },
  })

  console.log('1) signInWithOtp', email)
  const { error: otpError } = await signupClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: REDIRECT_TO,
      shouldCreateUser: true,
      data: { full_name: 'PKCE Same Browser' },
    },
  })
  assert(!otpError, `OTP failed: ${otpError?.message}`)
  assert(shared.hasVerifier(), 'code_verifier must exist after OTP')
  console.log('   verifier stored:', shared.hasVerifier())

  // STEP 2: mail click → callback URL with code
  console.log('2) waiting for email')
  const body = await pollMailinator(inbox)
  const verifyUrl = extractVerifyUrl(body)
  assert(verifyUrl, 'verify URL missing from email')
  const callbackUrl = await followToCallback(verifyUrl)
  const code = new URL(callbackUrl).searchParams.get('code')
  assert(code, 'callback code missing')
  console.log('\n   callback code:', code.slice(0, 8))

  // STEP 3: same Chrome profile opens /auth/callback (new tab = new client, shared storage)
  // Simulate SPA boot with detectSessionInUrl on the callback URL.
  globalThis.window = {
    location: {
      href: callbackUrl,
      origin: 'https://www.hlckm.co.kr',
      pathname: '/auth/callback',
      search: new URL(callbackUrl).search,
      hash: '',
    },
    history: {
      state: null,
      replaceState(_state, _title, url) {
        const next = new URL(url, 'https://www.hlckm.co.kr')
        globalThis.window.location.href = next.href
        globalThis.window.location.pathname = next.pathname
        globalThis.window.location.search = next.search
      },
    },
    localStorage: shared.api,
  }
  globalThis.localStorage = shared.api

  const callbackClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      flowType: 'pkce',
      detectSessionInUrl: true,
      autoRefreshToken: false,
      storage: shared.api,
    },
  })

  // Allow initialize() to finish auto-exchange
  await new Promise((resolve) => setTimeout(resolve, 1500))

  let {
    data: { session },
  } = await callbackClient.auth.getSession()

  if (!session) {
    console.log('   auto detectSessionInUrl did not create session yet — manual exchange')
    const exchanged = await callbackClient.auth.exchangeCodeForSession(code)
    assert(!exchanged.error, `exchange failed: ${exchanged.error?.message}`)
    session = exchanged.data.session
  }

  assert(session?.user?.email?.toLowerCase() === email, 'session email mismatch')
  assert(Boolean(session.user.email_confirmed_at), 'email not confirmed')
  console.log('3) auth complete', {
    email: session.user.email,
    confirmedAt: session.user.email_confirmed_at,
    verifierCleared: !shared.hasVerifier(),
  })

  // STEP 4: complete signup (password + profile) on same session
  console.log('4) complete signup profile')
  const { error: passwordError } = await callbackClient.auth.updateUser({
    password,
    data: { name: '테스트유저', username: loginId },
  })
  assert(!passwordError, `updateUser failed: ${passwordError?.message}`)

  const profilePayload = {
    user_id: session.user.id,
    username: loginId,
    name: '테스트유저',
    email,
    birth_date: '1990-01-15',
    phone: '010-1234-5678',
    role: 'member',
    congregant_type: 'member',
    attending_church: null,
    security_question: 'memorable-bible-verse',
    security_answer: '요한복음3:16',
  }

  const { data: profile, error: profileError } = await callbackClient
    .from('profiles')
    .insert(profilePayload)
    .select('id, username, email')
    .single()

  if (profileError) {
    // Column set may differ; retry minimal columns
    console.warn('   profile insert full payload failed, retrying minimal', profileError.message)
    const { data: minimalProfile, error: minimalError } = await callbackClient
      .from('profiles')
      .insert({
        user_id: session.user.id,
        username: loginId,
        name: '테스트유저',
        email,
        birth_date: '1990-01-15',
        phone: '010-1234-5678',
        role: 'member',
      })
      .select('id, username, email')
      .single()
    assert(!minimalError, `profile insert failed: ${minimalError?.message}`)
    console.log('   profile saved (minimal)', minimalProfile)
  } else {
    console.log('   profile saved', profile)
  }

  await callbackClient.auth.signOut()
  console.log('PASS: same-browser flow completed')
  return { email, loginId }
}

async function testOtherBrowserBlocked() {
  console.log('\n=== Other browser: missing verifier ===')
  const signupStore = createMemoryStorage('SIGNUP')
  const otherStore = createMemoryStorage('OTHER')
  const inbox = `pkce-other-${Date.now().toString(36)}`
  const email = `${inbox}@mailinator.com`

  const signupClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      flowType: 'pkce',
      detectSessionInUrl: true,
      autoRefreshToken: false,
      storage: signupStore.api,
    },
  })

  await signupClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: REDIRECT_TO, shouldCreateUser: true },
  })

  const body = await pollMailinator(inbox)
  const callbackUrl = await followToCallback(extractVerifyUrl(body))
  const code = new URL(callbackUrl).searchParams.get('code')

  const otherClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      flowType: 'pkce',
      detectSessionInUrl: true,
      autoRefreshToken: false,
      storage: otherStore.api,
    },
  })

  const { error } = await otherClient.auth.exchangeCodeForSession(code)
  assert(error, 'expected exchange to fail without verifier')
  assert(isMissingPkceVerifierError(error), `unexpected error: ${error.message}`)
  const uiMessage = toAuthCallbackUserMessage(error)
  assert(uiMessage.includes(AUTH_CROSS_BROWSER_MESSAGE), uiMessage)
  console.log('\nPASS: other browser blocked with correct message')
}

async function main() {
  await testCrossBrowserMessage()
  const result = await testSameBrowserFullSignup()
  await testOtherBrowserBlocked()
  console.log('\n=== SUMMARY ===')
  console.log(
    JSON.stringify(
      {
        sameBrowserSignupComplete: true,
        crossBrowserMessage: AUTH_CROSS_BROWSER_MESSAGE,
        testUser: result,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error('\nE2E FAILED', error)
  process.exit(1)
})
