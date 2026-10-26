import assert from 'node:assert/strict'
import test from 'node:test'
import { layoutAdjacentBoardImages, prepareBoardImagesForEditor } from '../src/utils/boardImageLayout.js'

const img = (id, layout = '') =>
  `<img src="${id}.jpg" alt="${id}"${layout ? ` data-layout="${layout}"` : ''}>`

test('legacy adjacent images stay paired for existing posts', () => {
  const html = `${img('a')}${img('b')}${img('c')}`
  const laidOut = layoutAdjacentBoardImages(html)

  assert.match(laidOut, /board-image-row/)
  assert.match(laidOut, /a\.jpg/)
  assert.match(laidOut, /b\.jpg/)
  assert.match(laidOut, /c\.jpg/)
  assert.equal(laidOut.match(/board-image-row/g).length, 1)
  assert.equal(prepareBoardImagesForEditor(html), laidOut)
})

test('new stacked images stay vertical and explicit rows stay intact', () => {
  const html = [
    `<div class="board-image-row" data-layout="pair">${img('a', 'stack')}${img('b', 'stack')}</div>`,
    img('c', 'stack'),
    `<div class="board-image-row" data-layout="pair">${img('d', 'stack')}${img('e', 'stack')}</div>`,
  ].join('')

  assert.equal(layoutAdjacentBoardImages(html), html)
  assert.equal(prepareBoardImagesForEditor(html), html)
})

test('stacked images are not paired with each other', () => {
  const html = `${img('a', 'stack')}${img('b', 'stack')}${img('c', 'stack')}`
  assert.equal(layoutAdjacentBoardImages(html), html)
})
