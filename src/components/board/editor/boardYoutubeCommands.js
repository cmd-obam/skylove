import { NodeSelection } from '@tiptap/pm/state'

function selectedYoutube(state) {
  const selection = state.selection
  if (selection?.node?.type?.name !== 'boardYoutube') {
    return null
  }

  const $pos = state.doc.resolve(selection.from)
  return {
    node: selection.node,
    parent: $pos.parent,
    index: $pos.index(),
    $pos,
  }
}

function isEmptyParagraph(node) {
  return node.type.name === 'paragraph' && node.content.size === 0
}

function neighborIndex(parent, index, direction) {
  let cursor = index + direction
  while (cursor >= 0 && cursor < parent.childCount) {
    if (!isEmptyParagraph(parent.child(cursor))) {
      return cursor
    }
    cursor += direction
  }
  return -1
}

function childPosition(parent, parentStart, index) {
  let pos = parentStart
  for (let i = 0; i < index; i += 1) {
    pos += parent.child(i).nodeSize
  }
  return pos
}

export function moveBoardYoutube(state, dispatch, direction) {
  const selected = selectedYoutube(state)
  if (!selected) {
    return false
  }

  const { parent, index, node, $pos } = selected
  const otherIndex = neighborIndex(parent, index, direction === 'up' ? -1 : 1)
  if (otherIndex < 0) {
    return false
  }

  const start = Math.min(index, otherIndex)
  const end = Math.max(index, otherIndex)
  const from = childPosition(parent, $pos.start(), start)
  const moving = node
  const other = parent.child(otherIndex)
  const replacement = index < otherIndex ? [other, moving] : [moving, other]
  const to = childPosition(parent, $pos.start(), end) + parent.child(end).nodeSize

  if (dispatch) {
    const tr = state.tr.replaceWith(from, to, replacement)
    const nodePos = index < otherIndex ? from + other.nodeSize : from
    tr.setSelection(NodeSelection.create(tr.doc, nodePos))
    dispatch(tr.scrollIntoView())
  }

  return true
}
