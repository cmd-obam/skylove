/**
 * 아이디/비밀번호 찾기 회원 조회 진단
 * 사용: node --env-file=.env scripts/diagnose-account-recovery.mjs
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
  console.error('[diagnose] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY 가 없습니다.')
  process.exit(1)
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  let parsed = null

  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = text
  }

  return { status: response.status, body: parsed }
}

console.log('[diagnose] Supabase host:', new URL(supabaseUrl).host)

const rpcChecks = [
  'lookup_member_by_name_email',
  'find_username_by_name_email',
  'resolve_email_by_name_email',
]

for (const rpcName of rpcChecks) {
  const result = await postJson(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
    p_name: '__diagnose__',
    p_email: 'diagnose@example.com',
  })

  const exists = result.status !== 404 || result.body?.code !== 'PGRST202'
  console.log(`\n[RPC] ${rpcName}: ${exists ? 'OK (exists)' : 'MISSING'}`)
  console.log(' status:', result.status)
  console.log(' body:', JSON.stringify(result.body))
}

const edgeResult = await postJson(`${supabaseUrl}/functions/v1/find_by_name_email`, {
  name: '__diagnose__',
  email: 'diagnose@example.com',
})

const edgeDeployed = !(
  edgeResult.status === 404 && edgeResult.body?.message === 'Requested function was not found'
)

console.log(`\n[Edge] find_by_name_email: ${edgeDeployed ? 'OK (deployed)' : 'NOT DEPLOYED'}`)
console.log(' status:', edgeResult.status)
console.log(' body:', JSON.stringify(edgeResult.body))

if (!edgeDeployed) {
  console.log('\n[fix] Edge Function 배포:')
  console.log('  npx supabase login')
  console.log('  npm run deploy:find-by-name-email')
}

console.log('\n[fix] RPC 미설정 시 SQL Editor에서 실행:')
console.log('  supabase/fix_account_recovery.sql')
