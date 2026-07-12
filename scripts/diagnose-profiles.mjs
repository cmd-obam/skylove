/**
 * profiles 테이블 / PostgREST 스키마 진단
 * 사용: node --env-file=.env scripts/diagnose-profiles.mjs
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

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    vars[key] = value
  }

  return vars
}

const fileEnv = loadEnvFile()
const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? fileEnv.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''

if (!supabaseUrl || !supabaseKey) {
  console.error('[diagnose] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY 가 없습니다 (.env 확인)')
  process.exit(1)
}

const PROFILE_SELECT = 'name,email,birth_date,phone,username,role'
const COLUMN_CHECKS = ['username', 'name', 'email', 'birth_date', 'phone', 'role', 'user_id']

async function restGet(path, headers = {}) {
  const url = `${supabaseUrl}/rest/v1/${path}`
  const response = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/json',
      ...headers,
    },
  })

  const text = await response.text()
  let body

  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }

  return {
    url,
    status: response.status,
    statusText: response.statusText,
    body,
  }
}

function printResult(label, result) {
  console.log(`\n=== ${label} ===`)
  console.log('URL:', result.url)
  console.log('Status:', result.status, result.statusText)
  console.log('Response:', JSON.stringify(result.body, null, 2))
}

console.log('[diagnose] Supabase URL host:', new URL(supabaseUrl).host)
console.log('[diagnose] fetchProfileByUserId equivalent:')
console.log(`  GET /rest/v1/profiles?select=${encodeURIComponent(PROFILE_SELECT)}&user_id=eq.{userId}`)

printResult('1) Full PROFILE_SELECT (limit 0)', await restGet(`profiles?select=${encodeURIComponent(PROFILE_SELECT)}&limit=0`))

for (const column of COLUMN_CHECKS) {
  printResult(`2) Column check: ${column}`, await restGet(`profiles?select=${column}&limit=0`))
}

printResult('3) OpenAPI / PostgREST schema reload hint', await restGet(''))

const openApiResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
  headers: {
    apikey: supabaseKey,
    Accept: 'application/openapi+json',
  },
})

if (openApiResponse.ok) {
  const schema = await openApiResponse.json()
  const profilesSchema = schema?.definitions?.profiles?.properties ?? schema?.components?.schemas?.profiles?.properties

  if (profilesSchema) {
    console.log('\n=== 4) PostgREST profiles columns (schema cache) ===')
    console.log(Object.keys(profilesSchema).sort().join(', '))
    console.log('role in schema:', Object.prototype.hasOwnProperty.call(profilesSchema, 'role') ? 'YES' : 'NO')
  } else {
    console.log('\n=== 4) PostgREST OpenAPI: profiles definition not found in expected path ===')
  }
} else {
  console.log('\n=== 4) OpenAPI fetch failed ===', openApiResponse.status, await openApiResponse.text())
}

console.log('\n[diagnose] 완료')
