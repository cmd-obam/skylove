import assert from 'node:assert/strict'
import {
  formatVisitorCount,
  getKoreaDateString,
  getVisitorStorageKey,
} from '../src/utils/visitorDate.js'

const fixed = new Date('2026-07-18T01:00:00+09:00')
assert.equal(getKoreaDateString(fixed), '2026-07-18')
assert.equal(getVisitorStorageKey(getKoreaDateString(fixed)), 'visitor_2026-07-18')
assert.equal(formatVisitorCount(27), '27')
assert.equal(formatVisitorCount(8521), '8,521')
assert.equal(formatVisitorCount(null), '0')

// Late evening KST still same calendar day
assert.equal(getKoreaDateString(new Date('2026-07-18T23:59:00+09:00')), '2026-07-18')
// Just after midnight KST rolls over
assert.equal(getKoreaDateString(new Date('2026-07-19T00:00:30+09:00')), '2026-07-19')

console.log('visitor stats helpers: ok')
