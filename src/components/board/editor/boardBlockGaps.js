import { TextSelection } from '@tiptap/pm/state'

export const MEDIA_BLOCK_TYPES = new Set(['image', 'boardYoutube', 'boardVideo', 'boardImageRow'])

export function mediaBlockPosition(state, pos) {
  if (typeof pos !== 'number') {
    return null
  }

  const node = state.doc.nodeAt(pos)
  if (!node) {
    return null
  }

  if (node.type.name === 'image') {
    const $pos = state.doc.resolve(pos)
    if ($pos.parent.type.name === 'boardImageRow') {
      return { pos: $pos.before(), node: $pos.parent }
    }
  }

  if (!MEDIA_BLOCK_TYPES.has(node.type.name)) {
    return null
  }

  return { pos, node }
}

export function isBoardEditorChromeEvent(event) {
  const target = event?.target
  if (!target || typeof target.closest !== 'function') {
    return false
  }

  return Boolean(target.closest('input, textarea, button, a, label'))
}

export function readNodePos(getPos) {
  if (typeof getPos !== 'function') {
    return null
  }

  try {
    const pos = getPos()
    return typeof pos === 'number' ? pos : null
  } catch {
    return null
  }
}

export function focusOrInsertParagraphAfter(state, pos, text = '') {
  const target = mediaBlockPosition(state, pos)
  if (!target) {
    return null
  }

  const insertAt = target.pos + target.node.nodeSize
  const next = state.doc.resolve(insertAt).nodeAfter
  const nextIsParagraph = next?.type.name === 'paragraph'
  let tr = state.tr
  let cursorAt = insertAt + 1

  if (nextIsParagraph && (next.content.size === 0 || !text)) {
    if (text) {
      tr = tr.insertText(text, insertAt + 1)
      cursorAt = insertAt + 1 + text.length
    }
  } else {
    const content = text ? state.schema.text(text) : null
    const paragraph = state.schema.nodes.paragraph.create(null, content)
    tr = tr.insert(insertAt, paragraph)
    cursorAt = insertAt + 1 + text.length
  }

  return tr.setSelection(TextSelection.create(tr.doc, cursorAt)).scrollIntoView()
}
