/**
 * find_by_name_email Edge Function 호출 테스트
 * 사용: node --env-file=.env scripts/test-find-by-name-email.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnvFile() {
  const envPath = resolve(root, '.env')

  if (!existsSync(envPath)) {
    return {}
  }

  const vars = {}

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const eq = trimmed.indexOf('=')

    if (eq === -1) {
      continue
    }

    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }

  return vars
}

const fileEnv = loadEnvFile()
const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? fileEnv.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
const supabaseKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''

if (!supabaseUrl || !supabaseKey) {
  console.error('[test] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY 가 필요합니다.')
  process.exit(1)
}

const endpoint = `${supabaseUrl}/functions/v1/find_by_name_email`

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${supabaseKey}`,
    apikey: supabaseKey,
  },
  body: JSON.stringify({
    name: '테스트',
    email: 'test@example.com',
  }),
})

const text = await response.text()

console.log('[test] endpoint:', endpoint)
console.log('[test] status:', response.status, response.statusText)
console.log('[test] body:', text)

let parsed = null

try {
  parsed = JSON.parse(text)
} catch {
  parsed = null
}

const isFunctionMissing =
  response.status === 404 &&
  (parsed?.code === 'NOT_FOUND' || parsed?.message === 'Requested function was not found')

if (isFunctionMissing) {
  console.error('[test] 404 — Edge Function이 배포되지 않았습니다.')
  console.error(
    '[test] 배포: npx supabase login && npx supabase functions deploy find_by_name_email --project-ref nwsytxwurnaxaabztomh --no-verify-jwt',
  )
  process.exit(1)
}

if (response.status === 200 || parsed?.error === 'not_found') {
  console.log('[test] Edge Function 배포 및 응답 확인 완료')
  process.exit(0)
}

process.exit(response.ok ? 0 : 1)
