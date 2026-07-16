/**
 * Chrome (same profile): inject PKCE verifier → open /auth/callback?code=
 * against local preview of the fixed AuthCallback UI.
 *
 *   npx vite-node scripts/test-pkce-chrome-callback.mjs
 */
import { createClient } from '@supabase/supabase-js'
import puppeteer from 'puppeteer-core'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_KEY
const REDIRECT_TO = 'https://www.hlckm.co.kr/auth/callback'
const PREVIEW_PORT = 4177
const PREVIEW_ORIGIN = `http://127.0.0.1:${PREVIEW_PORT}`

function createMemoryStorage() {
  const memory = new Map()
  return {
    memory,
    api: {
      getItem: (key) => (memory.has(key) ? memory.get(key) : null),
      setItem: (key, value) => memory.set(key, String(value)),
      removeItem: (key) => memory.delete(key),
    },
    dump: () => Object.fromEntries(memory.entries()),
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
    await sleep(2500)
  }
  throw new Error('Mailinator timeout')
}

function extractVerifyUrl(body) {
  const match = body.match(
    /https:\/\/nwsytxwurnaxaabztomh\.supabase\.co\/auth\/v1\/verify[^\s"'<>\]]+/i,
  )
  return match?.[0]?.replace(/&amp;/g, '&').replace(/[\]>).,;]+$/g, '') ?? null
}

async function followToCallback(verifyUrl) {
  let current = verifyUrl
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const parsed = new URL(current)
    if (parsed.pathname.includes('/auth/callback')) return current
    const response = await fetch(current, { redirect: 'manual', headers: { Accept: 'text/html' } })
    const location = response.headers.get('location')
    if (!location) throw new Error(`No redirect ${response.status}`)
    current = new URL(location, current).href
  }
  throw new Error('Too many redirects')
}

async function startPreview() {
  const child = spawn(
    'npx',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PREVIEW_PORT)],
    {
      cwd: '/workspace',
      env: {
        ...process.env,
        VITE_SUPABASE_URL: SUPABASE_URL,
        VITE_SUPABASE_PUBLISHABLE_KEY: SUPABASE_KEY,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('preview timeout')), 30000)
    const onData = (buf) => {
      const text = buf.toString()
      if (text.includes('Local:') || text.includes('preview')) {
        clearTimeout(timer)
        resolve()
      }
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('exit', (code) => reject(new Error(`preview exited ${code}`)))
  })

  await sleep(500)
  return child
}

async function main() {
  console.log('Building...')
  const build = spawn('npm', ['run', 'build'], {
    cwd: '/workspace',
    env: {
      ...process.env,
      VITE_SUPABASE_URL: SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: SUPABASE_KEY,
    },
    stdio: 'inherit',
  })
  await new Promise((resolve, reject) => {
    build.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build ${code}`))))
  })

  const storage = createMemoryStorage()
  const inbox = `chrome-cb-${Date.now().toString(36)}`
  const email = `${inbox}@mailinator.com`

  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      flowType: 'pkce',
      detectSessionInUrl: false,
      autoRefreshToken: false,
      storage: storage.api,
    },
  })

  console.log('Sending OTP to', email)
  const { error: otpError } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: REDIRECT_TO, shouldCreateUser: true },
  })
  if (otpError) throw otpError

  const body = await pollMailinator(inbox)
  const callbackUrl = await followToCallback(extractVerifyUrl(body))
  const code = new URL(callbackUrl).searchParams.get('code')
  if (!code) throw new Error('no code')

  const dumped = storage.dump()
  const verifierKey = Object.keys(dumped).find((key) => key.includes('code-verifier'))
  if (!verifierKey) throw new Error('no verifier in storage')

  const preview = await startPreview()
  let browser

  try {
    browser = await puppeteer.launch({
      executablePath: '/usr/local/bin/google-chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })

    const page = await browser.newPage()
    page.on('console', (msg) => console.log('[chrome]', msg.type(), msg.text()))

    // Same Chrome profile: seed localStorage on preview origin, then open callback with code.
    await page.goto(`${PREVIEW_ORIGIN}/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(
      (entries) => {
        for (const [key, value] of Object.entries(entries)) {
          window.localStorage.setItem(key, value)
        }
      },
      dumped,
    )

    const localCallback = `${PREVIEW_ORIGIN}/auth/callback?code=${encodeURIComponent(code)}`
    console.log('Opening', localCallback)
    await page.goto(localCallback, { waitUntil: 'networkidle0', timeout: 60000 })

    // Wait for success or error UI
    try {
      await page.waitForFunction(
        () => {
          const title = document.querySelector('.auth-callback-page__title')
          return title && /완료|실패|다른 브라우저/.test(title.textContent || '')
        },
        { timeout: 45000 },
      )
    } catch (error) {
      const html = await page.content()
      console.error('Timeout body snippet:', html.slice(0, 1500))
      throw error
    }

    const title = await page.$eval('.auth-callback-page__title', (el) => el.textContent.trim())
    const text = await page.$eval('.auth-callback-page__text', (el) => el.textContent.trim())
    console.log('UI title:', title)
    console.log('UI text:', text.slice(0, 200))

    if (!title.includes('완료')) {
      throw new Error(`Expected success UI, got: ${title}`)
    }

    console.log('PASS: Chrome same-profile AuthCallback success')
  } finally {
    if (browser) await browser.close()
    preview.kill('SIGTERM')
  }
}

main().catch((error) => {
  console.error('CHROME E2E FAILED', error)
  process.exit(1)
})
