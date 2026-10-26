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
  const otherIndex = direction === 'up' ? index - 1 : index + 1
  if (otherIndex < 0 || otherIndex >= parent.childCount) {
    return false
  }

  const other = parent.child(otherIndex)
  const startIndex = Math.min(index, otherIndex)
  const from = childPosition(parent, $pos.start(), startIndex)
  const to = from + parent.child(startIndex).nodeSize + parent.child(startIndex + 1).nodeSize
  const replacement = index < otherIndex ? [other, node] : [node, other]

  if (dispatch) {
    const tr = state.tr.replaceWith(from, to, replacement)
    const nodePos = index < otherIndex ? from + other.nodeSize : from
    const selectedNode = tr.doc.resolve(nodePos).nodeAfter
    if (selectedNode && NodeSelection.isSelectable(selectedNode)) {
      tr.setSelection(NodeSelection.create(tr.doc, nodePos))
    }
    dispatch(tr.scrollIntoView())
  }

  return true
}
