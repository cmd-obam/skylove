/**
 * Force-update hosted Supabase Magic Link email template (Korean).
 *
 * Signup uses auth.signInWithOtp() → Magic Link / OTP template.
 * Dashboard edits sometimes fail to stick; this PATCHes Auth config directly.
 *
 * 1) Create a token: https://supabase.com/dashboard/account/tokens
 * 2) Run:
 *      $env:SUPABASE_ACCESS_TOKEN="sbp_..."
 *      node scripts/update-magic-link-template.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'nwsytxwurnaxaabztomh'
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || ''

const SUBJECT = '[하늘사랑교회] 이메일 인증을 완료해주세요.'
const BODY_PATH = path.join(__dirname, '../supabase/email-templates/magic-link.html')

if (!ACCESS_TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN')
  console.error('Create one at https://supabase.com/dashboard/account/tokens')
  console.error('Then: $env:SUPABASE_ACCESS_TOKEN="sbp_..."; node scripts/update-magic-link-template.mjs')
  process.exit(1)
}

const body = fs.readFileSync(BODY_PATH, 'utf8').trim()

const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`

console.log('PATCH', url)
console.log('project_ref=', PROJECT_REF)
console.log('subject=', SUBJECT)

const response = await fetch(url, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    mailer_subjects_magic_link: SUBJECT,
    mailer_templates_magic_link_content: body,
  }),
})

const text = await response.text()
console.log('status=', response.status)
if (!response.ok) {
  console.error(text)
  process.exit(1)
}

let json = null
try {
  json = JSON.parse(text)
} catch {
  console.log(text.slice(0, 500))
  process.exit(0)
}

console.log('saved_subject=', json.mailer_subjects_magic_link ?? '(not returned)')
console.log(
  'saved_body_preview=',
  String(json.mailer_templates_magic_link_content ?? '').slice(0, 120),
)
console.log('OK: Magic Link template updated. Request a new signup verification email.')
