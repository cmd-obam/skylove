/**
 * Minimal unit checks for security answer rate-limit helper.
 * (Uses a fake localStorage for Node.)
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const store = new Map()
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
}

const modulePath = pathToFileURL(
  path.resolve('src/utils/securityAnswerRateLimit.js'),
).href

const {
  getSecurityAnswerLockStatus,
  recordSecurityAnswerFailure,
  clearSecurityAnswerFailures,
} = await import(modulePath)

const key = 'user@example.com'

clearSecurityAnswerFailures(key)
assert.equal(getSecurityAnswerLockStatus(key).locked, false)
assert.equal(getSecurityAnswerLockStatus(key).remainingAttempts, 5)

for (let i = 1; i <= 4; i += 1) {
  const status = recordSecurityAnswerFailure(key)
  assert.equal(status.locked, false, `should not lock at failure ${i}`)
  assert.equal(status.remainingAttempts, 5 - i)
}

const locked = recordSecurityAnswerFailure(key)
assert.equal(locked.locked, true)
assert.match(locked.message, /10분/)

clearSecurityAnswerFailures(key)
assert.equal(getSecurityAnswerLockStatus(key).locked, false)

const { normalizeAnswer } = await import(
  pathToFileURL(path.resolve('src/services/auth/normalizeAnswer.js')).href
)

assert.equal(normalizeAnswer('하늘 사랑 교회'), normalizeAnswer('하늘사랑교회'))
assert.equal(normalizeAnswer('Apple'), normalizeAnswer('APPLE'))
assert.notEqual(normalizeAnswer('하늘사랑교회'), normalizeAnswer('하늘사랑'))

console.log('PASS security answer rate-limit + normalizeAnswer reuse checks')
// silence unused
void createRequire
