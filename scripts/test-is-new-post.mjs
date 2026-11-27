import assert from 'node:assert/strict'
import test from 'node:test'
import { NEW_POST_WINDOW_MS, isNewPost } from '../src/utils/isNewPost.js'

const created = new Date('2026-11-27T00:00:00.000Z')

test('최초 작성 후 72시간 동안만 NEW로 본다', () => {
  assert.equal(isNewPost(created, created.getTime()), true)
  assert.equal(isNewPost(created, created.getTime() + NEW_POST_WINDOW_MS), true)
  assert.equal(isNewPost(created, created.getTime() + NEW_POST_WINDOW_MS + 1), false)
  assert.equal(isNewPost(created, created.getTime() - 1), false)
  assert.equal(isNewPost('', created.getTime()), false)
  assert.equal(isNewPost('not-a-date', created.getTime()), false)
})
