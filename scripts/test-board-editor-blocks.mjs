import test from 'node:test'
import assert from 'node:assert/strict'
import { Schema } from '@tiptap/pm/model'
import { EditorState, NodeSelection } from '@tiptap/pm/state'
import { focusOrInsertParagraphAfter, readNodePos } from '../src/components/board/editor/boardBlockGaps.js'
import { moveBoardYoutube } from '../src/components/board/editor/boardYoutubeCommands.js'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    text: { group: 'inline' },
    paragraph: {
      content: 'text*',
      group: 'block',
      toDOM: () => ['p', 0],
    },
    image: {
      group: 'block',
      atom: true,
      attrs: { src: { default: '' } },
      toDOM: (node) => ['img', { src: node.attrs.src }],
    },
    boardYoutube: {
      group: 'block',
      atom: true,
      attrs: { videoId: { default: null } },
      toDOM: () => ['div'],
    },
    boardImageRow: {
      content: 'image{1,2}',
      group: 'block',
      toDOM: () => ['div', 0],
    },
  },
})

function blockNames(doc) {
  const names = []
  doc.forEach((node) => {
    if (node.type.name === 'paragraph') {
      names.push(node.textContent ? `p:${node.textContent}` : 'p')
    } else if (node.type.name === 'boardImageRow') {
      names.push(`row:${node.childCount}`)
    } else {
      names.push(node.type.name)
    }
  })
  return names.join(',')
}

function withSelection(state, pos) {
  return state.apply(state.tr.setSelection(NodeSelection.create(state.doc, pos)))
}

test('youtube keeps moving one block at a time until the edge', () => {
  const doc = schema.nodes.doc.create(null, [
    schema.nodes.boardYoutube.create(),
    schema.nodes.paragraph.create(),
    schema.nodes.paragraph.create(null, schema.text('가')),
    schema.nodes.image.create({ src: 'a.jpg' }),
  ])
  let state = withSelection(EditorState.create({ schema, doc }), 0)
  const dispatch = (tr) => {
    state = state.apply(tr)
  }

  assert.equal(moveBoardYoutube(state, dispatch, 'down'), true)
  assert.equal(blockNames(state.doc), 'p,boardYoutube,p:가,image')
  assert.equal(state.selection.node.type.name, 'boardYoutube')

  assert.equal(moveBoardYoutube(state, dispatch, 'down'), true)
  assert.equal(blockNames(state.doc), 'p,p:가,boardYoutube,image')

  assert.equal(moveBoardYoutube(state, dispatch, 'down'), true)
  assert.equal(blockNames(state.doc), 'p,p:가,image,boardYoutube')

  assert.equal(moveBoardYoutube(state, dispatch, 'down'), false)
  assert.equal(blockNames(state.doc), 'p,p:가,image,boardYoutube')

  assert.equal(moveBoardYoutube(state, dispatch, 'up'), true)
  assert.equal(moveBoardYoutube(state, dispatch, 'up'), true)
  assert.equal(moveBoardYoutube(state, dispatch, 'up'), true)
  assert.equal(blockNames(state.doc), 'boardYoutube,p,p:가,image')
  assert.equal(moveBoardYoutube(state, dispatch, 'up'), false)
})

test('moving a youtube past an image row keeps the pair intact', () => {
  const row = schema.nodes.boardImageRow.create(null, [
    schema.nodes.image.create({ src: 'a.jpg' }),
    schema.nodes.image.create({ src: 'b.jpg' }),
  ])
  const doc = schema.nodes.doc.create(null, [row, schema.nodes.boardYoutube.create()])
  let state = withSelection(EditorState.create({ schema, doc }), row.nodeSize)
  const dispatch = (tr) => {
    state = state.apply(tr)
  }

  assert.equal(moveBoardYoutube(state, dispatch, 'up'), true)
  assert.equal(blockNames(state.doc), 'boardYoutube,row:2')
  assert.equal(state.doc.child(1).childCount, 2)
})

test('text can be inserted between stacked images', () => {
  const doc = schema.nodes.doc.create(null, [
    schema.nodes.image.create({ src: 'a.jpg' }),
    schema.nodes.image.create({ src: 'b.jpg' }),
  ])
  let state = EditorState.create({ schema, doc })

  state = state.apply(focusOrInsertParagraphAfter(state, 0, '사이'))
  assert.equal(blockNames(state.doc), 'image,p:사이,image')
  assert.equal(state.selection.$from.parent.textContent, '사이')

  const focused = state.apply(focusOrInsertParagraphAfter(state, 0, ''))
  assert.equal(blockNames(focused.doc), 'image,p:사이,image')
  assert.equal(focused.selection.$from.parent.textContent, '사이')
})

test('an image inside a pair opens text after the pair', () => {
  const row = schema.nodes.boardImageRow.create(null, [
    schema.nodes.image.create({ src: 'a.jpg' }),
    schema.nodes.image.create({ src: 'b.jpg' }),
  ])
  const doc = schema.nodes.doc.create(null, [row, schema.nodes.boardYoutube.create()])
  const state = EditorState.create({ schema, doc })
  const next = state.apply(focusOrInsertParagraphAfter(state, 1, '사이'))

  assert.equal(blockNames(next.doc), 'row:2,p:사이,boardYoutube')
  assert.equal(next.doc.child(0).childCount, 2)
})

test('readNodePos ignores a position that is no longer mounted', () => {
  assert.equal(readNodePos(() => {
    throw new Error('unmounted')
  }), null)
  assert.equal(readNodePos(() => 4), 4)
})
