import assert from 'node:assert/strict'
import test from 'node:test'
import {
  boardPostLookupKey,
  boardPostPublicId,
  getBoardPostCanonicalPath,
  isBoardPostNumber,
  isBoardPostUuid,
  isSameBoardPost,
} from '../src/utils/boardPostRef.js'

const UUID = '4e4b693e-4d8d-417e-bb9b-e6d66a78c57b'

test('uuid and public number stay distinct lookup keys', () => {
  assert.equal(isBoardPostUuid(UUID), true)
  assert.equal(isBoardPostNumber(UUID), false)
  assert.deepEqual(boardPostLookupKey(UUID), { column: 'id', value: UUID })
  assert.deepEqual(boardPostLookupKey('125'), { column: 'post_no', value: '125' })
  assert.equal(boardPostLookupKey('0125'), null)
  assert.equal(boardPostLookupKey('0'), null)
  assert.equal(boardPostLookupKey('album'), null)
})

test('public id prefers post number and canonical path replaces a uuid', () => {
  const post = { id: UUID, postNo: '125', postType: 'church_news' }

  assert.equal(boardPostPublicId(post), '125')
  assert.equal(boardPostPublicId({ id: UUID, postNo: null }), UUID)
  assert.equal(isSameBoardPost(post, '125'), true)
  assert.equal(isSameBoardPost(post, UUID), true)
  assert.equal(
    getBoardPostCanonicalPath(post, UUID, { routePostType: 'church_news' }),
    '/church-news/125',
  )
  assert.equal(
    getBoardPostCanonicalPath(post, '125', { routePostType: 'church_news' }),
    null,
  )
})

test('a number opened on the wrong board redirects to that post path', () => {
  const post = { id: UUID, postNo: '38', postType: 'pastor_story' }

  assert.equal(
    getBoardPostCanonicalPath(post, '38', { routePostType: 'church_news' }),
    '/church-news/pastor-story/38',
  )
  assert.equal(
    getBoardPostCanonicalPath(post, UUID, { mode: 'edit', routePostType: 'pastor_story' }),
    '/pastor-story/edit/38',
  )
})

test('posts without a public number keep the uuid address', () => {
  const post = { id: UUID, postNo: null, postType: 'album' }

  assert.equal(getBoardPostCanonicalPath(post, UUID, { routePostType: 'album' }), null)
  assert.equal(boardPostPublicId(post), UUID)
})
