import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { buildTrustedVisitPayload, resolveTrustedClientIp } from '../api/trustedClientIp.js'

const sql = readFileSync(new URL('../supabase/migrations/063_site_ip_visits.sql', import.meta.url), 'utf8')

test('trusted IP comes from Vercel headers and ignores the request body', () => {
  const headers = {
    'x-forwarded-for': '203.0.113.9',
    'x-real-ip': '198.51.100.20',
  }

  assert.equal(resolveTrustedClientIp(headers), '198.51.100.20')
  assert.equal(
    buildTrustedVisitPayload(headers, { ip: '1.2.3.4', user_id: 'forged', path: '/worship-guide?token=1' }).ip,
    '198.51.100.20',
  )
  assert.equal(
    buildTrustedVisitPayload(headers, { path: '/worship-guide?token=1' }).path,
    '/worship-guide',
  )
  assert.equal(resolveTrustedClientIp({ 'x-real-ip': '127.0.0.1' }), null)
  assert.equal(resolveTrustedClientIp({ 'x-vercel-forwarded-for': '203.0.113.8, 10.0.0.1' }), '203.0.113.8')
  assert.equal(resolveTrustedClientIp({}), null)
})

test('IP visit SQL keeps existing stats and limits reads to super admins', () => {
  assert.match(sql, /PERFORM public\.assert_super_admin\(\)/)
  assert.match(sql, /interval '10 minutes'/)
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.record_trusted_ip_visit/)
  assert.match(sql, /TO service_role/)
  assert.doesNotMatch(sql, /DELETE FROM public\.site_visitor_stats/)
  assert.doesNotMatch(sql, /DELETE FROM public\.site_traffic_events/)
  assert.doesNotMatch(sql, /DELETE FROM public\.profiles/)
  assert.doesNotMatch(sql, /DELETE FROM public\.board_posts/)
  assert.match(sql, /DELETE FROM public\.site_ip_visits/)
})
