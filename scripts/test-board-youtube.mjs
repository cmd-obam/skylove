import test from 'node:test'
import assert from 'node:assert/strict'
import { layoutAdjacentBoardImages } from '../src/utils/boardImageLayout.js'
import { renderBoardYouTubeEmbeds } from '../src/utils/boardYoutube.js'

test('youtube blocks keep their place between text and images', () => {
  const html = [
    '<p>인사</p>',
    '<div class="board-image-row" data-layout="pair"><img src="https://example.com/a.jpg"><img src="https://example.com/b.jpg"></div>',
    '<p>설명</p>',
    '<div class="board-youtube" data-youtube-id="abcdefghijk"></div>',
    '<p>안내</p>',
    '<img src="https://example.com/c.jpg" data-layout="stack">',
    '<div class="board-youtube" data-youtube-id="zyxwvutsrqp"></div>',
  ].join('')

  const rendered = renderBoardYouTubeEmbeds(html)

  assert.match(rendered, /인사[\s\S]*board-image-row[\s\S]*설명[\s\S]*embed\/abcdefghijk[\s\S]*안내[\s\S]*c\.jpg[\s\S]*embed\/zyxwvutsrqp/)
  assert.doesNotMatch(rendered, /<script|javascript:/i)
  assert.equal(rendered.includes('data-layout="pair"'), true)
  assert.equal(rendered.includes('data-layout="stack"'), true)
})

test('an invalid youtube block shows a message and no iframe', () => {
  const rendered = renderBoardYouTubeEmbeds(
    '<div class="board-youtube" data-youtube-id="bad"><script>alert(1)</script></div>',
  )

  assert.match(rendered, /유튜브 주소를 확인할 수 없습니다/)
  assert.equal(rendered.includes('<iframe'), false)
  assert.equal(rendered.includes('<script'), false)
})

test('an image row and a stacked image stay put around a youtube block', () => {
  const html = '<img src="https://example.com/a.jpg"><div class="board-youtube" data-youtube-id="abcdefghijk"></div><img src="https://example.com/b.jpg" data-layout="stack">'
  const laidOut = layoutAdjacentBoardImages(html)
  const rendered = renderBoardYouTubeEmbeds(laidOut)

  assert.equal((laidOut.match(/board-image-row/g) || []).length, 2)
  assert.equal(laidOut.includes('data-layout="pair"'), false)
  assert.ok(rendered.indexOf('a.jpg') < rendered.indexOf('embed/abcdefghijk'))
  assert.ok(rendered.indexOf('embed/abcdefghijk') < rendered.indexOf('b.jpg'))
  assert.equal(rendered.includes('data-layout="stack"'), true)
})
test('posts without a youtube block stay unchanged', () => {
  const html = '<p>기존 글</p><img src="https://example.com/a.jpg">'
  assert.equal(renderBoardYouTubeEmbeds(html), html)
})
