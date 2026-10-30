import assert from 'node:assert/strict'
import test from 'node:test'
import { Schema } from '@tiptap/pm/model'
import { EditorState, NodeSelection } from '@tiptap/pm/state'
import {
  layoutAdjacentBoardImages,
  normalizeBoardImageRows,
  prepareBoardImagesForEditor,
} from '../src/utils/boardImageLayout.js'
import {
  moveImageBlock,
  pairWithAdjacentImage,
  unpairImageRow,
} from '../src/components/board/editor/boardImageCommands.js'

const img = (id, layout = '') =>
  `<img src="${id}.jpg" alt="${id}"${layout ? ` data-layout="${layout}"` : ''}>`

test('legacy adjacent images stay paired for existing posts', () => {
  const html = `${img('a')}${img('b')}${img('c')}`
  const laidOut = layoutAdjacentBoardImages(html)

  assert.match(laidOut, /board-image-row/)
  assert.match(laidOut, /data-layout="pair"/)
  assert.match(laidOut, /a\.jpg/)
  assert.match(laidOut, /b\.jpg/)
  assert.match(laidOut, /c\.jpg/)
  assert.equal((laidOut.match(/data-layout="pair"/g) || []).length, 1)
  assert.equal((laidOut.match(/data-layout="stack"/g) || []).length >= 1, true)
})

test('new stacked images become stack rows and stay vertical', () => {
  const html = `${img('a', 'stack')}${img('b', 'stack')}${img('c', 'stack')}`
  const normalized = normalizeBoardImageRows(html)

  assert.equal((normalized.match(/board-image-row/g) || []).length, 3)
  assert.equal((normalized.match(/data-layout="stack"/g) || []).length >= 3, true)
  assert.doesNotMatch(normalized, /data-layout="pair"/)
  assert.equal(prepareBoardImagesForEditor(html), normalized)
})

test('explicit pair and stack rows stay intact for edit/display', () => {
  const html = [
    `<div class="board-image-row" data-layout="pair">${img('a', 'stack')}${img('b', 'stack')}</div>`,
    `<div class="board-image-row" data-layout="stack">${img('c', 'stack')}</div>`,
    `<div class="board-image-row" data-layout="pair">${img('d', 'stack')}${img('e', 'stack')}</div>`,
  ].join('')

  assert.equal(normalizeBoardImageRows(html), html)
  assert.equal(prepareBoardImagesForEditor(html), html)
})

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    text: { group: 'inline' },
    paragraph: { content: 'text*', group: 'block', toDOM: () => ['p', 0] },
    image: {
      group: 'block',
      atom: true,
      attrs: {
        src: { default: '' },
        alt: { default: null },
        width: { default: '100%' },
        'data-align': { default: 'center' },
        'data-layout': { default: 'stack' },
      },
      toDOM: () => ['img'],
    },
    boardImageRow: {
      content: 'image{1,2}',
      group: 'block',
      attrs: { 'data-layout': { default: 'stack' } },
      toDOM: () => ['div', 0],
    },
  },
})

function summary(doc) {
  const parts = []
  doc.forEach((node) => {
    if (node.type.name === 'boardImageRow') {
      const alts = []
      node.forEach((child) => alts.push(child.attrs.alt))
      parts.push(`${node.attrs['data-layout']}:${alts.join('+')}`)
    } else if (node.type.name === 'image') {
      parts.push(`bare:${node.attrs.alt}`)
    } else if (node.type.name === 'paragraph') {
      parts.push(node.textContent ? `p:${node.textContent}` : 'p')
    }
  })
  return parts.join('|')
}

function withImageSelection(doc, alt) {
  let pos = null
  doc.descendants((node, nodePos) => {
    if (pos == null && node.type.name === 'image' && String(node.attrs.alt) === String(alt)) {
      pos = nodePos
    }
  })
  return EditorState.create({
    schema,
    doc,
    selection: NodeSelection.create(doc, pos),
  })
}

test('pairing two stack rows creates a pair row and keeps the next stack alone', () => {
  const doc = schema.nodes.doc.create(null, [
    schema.nodes.boardImageRow.create({ 'data-layout': 'stack' }, [
      schema.nodes.image.create({ src: 'a.jpg', alt: '1' }),
    ]),
    schema.nodes.boardImageRow.create({ 'data-layout': 'stack' }, [
      schema.nodes.image.create({ src: 'b.jpg', alt: '2' }),
    ]),
    schema.nodes.boardImageRow.create({ 'data-layout': 'stack' }, [
      schema.nodes.image.create({ src: 'c.jpg', alt: '3' }),
    ]),
  ])

  let state = withImageSelection(doc, '1')
  const dispatch = (tr) => {
    state = state.apply(tr)
  }

  assert.equal(pairWithAdjacentImage(state, dispatch), true)
  assert.equal(summary(state.doc), 'pair:1+2|stack:3')

  const saved = [
    '<div class="board-image-row" data-layout="pair">',
    '<img src="a.jpg" alt="1" data-layout="stack">',
    '<img src="b.jpg" alt="2" data-layout="stack">',
    '</div>',
    '<div class="board-image-row" data-layout="stack">',
    '<img src="c.jpg" alt="3" data-layout="stack">',
    '</div>',
  ].join('')
  assert.equal(normalizeBoardImageRows(saved), saved)
})

test('unpairing a pair restores two stack rows', () => {
  const doc = schema.nodes.doc.create(null, [
    schema.nodes.boardImageRow.create({ 'data-layout': 'pair' }, [
      schema.nodes.image.create({ src: 'a.jpg', alt: '1' }),
      schema.nodes.image.create({ src: 'b.jpg', alt: '2' }),
    ]),
  ])
  let state = withImageSelection(doc, '1')
  const dispatch = (tr) => {
    state = state.apply(tr)
  }

  assert.equal(unpairImageRow(state, dispatch), true)
  assert.equal(summary(state.doc), 'stack:1|stack:2')
})

test('moving a stack row past another row keeps both as independent rows', () => {
  const doc = schema.nodes.doc.create(null, [
    schema.nodes.boardImageRow.create({ 'data-layout': 'stack' }, [
      schema.nodes.image.create({ src: 'a.jpg', alt: '1' }),
    ]),
    schema.nodes.paragraph.create(null, schema.text('설명')),
    schema.nodes.boardImageRow.create({ 'data-layout': 'stack' }, [
      schema.nodes.image.create({ src: 'b.jpg', alt: '2' }),
    ]),
  ])
  let state = withImageSelection(doc, '1')
  const dispatch = (tr) => {
    state = state.apply(tr)
  }

  assert.equal(moveImageBlock(state, dispatch, 'down'), true)
  assert.equal(summary(state.doc), 'p:설명|stack:1|stack:2')
})
