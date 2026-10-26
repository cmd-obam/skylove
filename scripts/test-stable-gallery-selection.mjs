import assert from 'node:assert/strict'
import test from 'node:test'
import { selectStableGalleryImages } from '../src/utils/stableGallerySelection.js'

function photos(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `photo-${index}`,
    src: `https://example.com/${index}.jpg`,
    postId: 'post',
  }))
}

test('fewer than four album photos are all shown', () => {
  const images = photos(3)
  assert.deepEqual(selectStableGalleryImages(images), images)
})

test('many album photos collapse to the same four after refresh', () => {
  const images = photos(16)
  const first = selectStableGalleryImages(images).map((image) => image.src)
  const second = selectStableGalleryImages(images).map((image) => image.src)

  assert.equal(first.length, 4)
  assert.deepEqual(second, first)
})

test('the four photos stay in their original newest-first order', () => {
  const images = photos(10)
  const selected = selectStableGalleryImages(images)
  const indexes = selected.map((image) => images.findIndex((item) => item.src === image.src))

  assert.deepEqual(indexes, [...indexes].sort((left, right) => left - right))
})

test('adding a photo can change the selection, but that new list stays fixed', () => {
  const images = photos(8)
  const withExtra = [...images, { id: 'extra', src: 'https://example.com/extra.jpg', postId: 'post' }]
  const again = selectStableGalleryImages(withExtra).map((image) => image.src)

  assert.equal(again.length, 4)
  assert.deepEqual(selectStableGalleryImages(withExtra).map((image) => image.src), again)
})
