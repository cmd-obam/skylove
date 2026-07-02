/**
 * Edge Function CORS / 호출 테스트
 * 사용: node --env-file=.env scripts/test-edge-function-cors.mjs
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

const functions = ['find_by_name_email', 'verify_security_answer', 'reset-password', 'delete-account']

async function testFunction(name) {
  const endpoint = `${supabaseUrl}/functions/v1/${name}`

  const optionsResponse = await fetch(endpoint, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  })

  const optionsCors = optionsResponse.headers.get('access-control-allow-origin')
  const optionsOk =
    optionsResponse.status === 200 &&
    optionsCors === '*' &&
    Boolean(optionsResponse.headers.get('access-control-allow-methods'))

  const postResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      name: '테스트',
      email: 'test@example.com',
      answer: 'test',
    }),
  })

  const postCors = postResponse.headers.get('access-control-allow-origin')
  const postText = await postResponse.text()

  console.log(`\n[${name}]`)
  console.log(' OPTIONS:', optionsResponse.status, optionsOk ? 'OK' : 'FAIL', 'ACA-Origin:', optionsCors)
  console.log(' POST:', postResponse.status, postCors === '*' ? 'CORS OK' : 'CORS FAIL')
  console.log(' body:', postText.slice(0, 160))

  return optionsOk && postCors === '*'
}

let allPassed = true

for (const fn of functions) {
  const passed = await testFunction(fn)

  if (!passed) {
    allPassed = false
  }
}

if (!allPassed) {
  console.error('\n[test] CORS 또는 Edge Function 배포 상태를 확인해주세요.')
  console.error('[fix] npx supabase login && npm run deploy:all-edge-functions')
  process.exit(1)
}

console.log('\n[test] 모든 Edge Function CORS preflight 확인 완료')
