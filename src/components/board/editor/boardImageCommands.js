function isSkippableGap(node) {
  return node.type.name === 'paragraph' && node.content.size === 0
}

function neighborImageIndex(parent, index, direction) {
  let cursor = index + direction
  while (cursor >= 0 && cursor < parent.childCount) {
    const child = parent.child(cursor)
    if (child.type.name === 'image') {
      return cursor
    }
    if (!isSkippableGap(child)) {
      return -1
    }
    cursor += direction
  }
  return -1
}

function selectedImage(state) {
  const selection = state.selection
  if (selection?.node?.type?.name !== 'image') {
    return null
  }

  const $pos = state.doc.resolve(selection.from)
  return {
    node: selection.node,
    pos: selection.from,
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

export function pairWithAdjacentImage(state, dispatch) {
  const selected = selectedImage(state)
  if (!selected || selected.parent.type.name === 'boardImageRow') {
    return false
  }

  const { parent, index, $pos } = selected
  const nextImage = neighborImageIndex(parent, index, 1)
  const previousImage = neighborImageIndex(parent, index, -1)
  let firstIndex = -1
  let secondIndex = -1

  if (nextImage >= 0) {
    firstIndex = index
    secondIndex = nextImage
  } else if (previousImage >= 0) {
    firstIndex = previousImage
    secondIndex = index
  }

  if (firstIndex < 0 || secondIndex < 0) {
    return false
  }

  const first = parent.child(firstIndex)
  const second = parent.child(secondIndex)
  const from = childPosition(parent, $pos.start(), firstIndex)
  const to = childPosition(parent, $pos.start(), secondIndex) + second.nodeSize
  const rowType = state.schema.nodes.boardImageRow
  if (!rowType) {
    return false
  }

  if (dispatch) {
    const row = rowType.create(null, [first, second])
    dispatch(state.tr.replaceWith(from, to, row))
  }

  return true
}

export function unpairImageRow(state, dispatch) {
  const selected = selectedImage(state)
  if (!selected || selected.parent.type.name !== 'boardImageRow') {
    return false
  }

  const row = selected.parent
  const rowPos = selected.$pos.before()
  const images = []
  row.forEach((child) => {
    if (child.type.name !== 'image') {
      return
    }
    images.push(child.type.create({ ...child.attrs, 'data-layout': 'stack' }))
  })

  if (images.length === 0) {
    return false
  }

  if (dispatch) {
    dispatch(state.tr.replaceWith(rowPos, rowPos + row.nodeSize, images))
  }

  return true
}

export function moveImageBlock(state, dispatch, direction) {
  const selected = selectedImage(state)
  if (!selected) {
    return false
  }

  const { parent, index, node, $pos } = selected
  const nextIndex = direction === 'up' ? index - 1 : index + 1
  if (nextIndex < 0 || nextIndex >= parent.childCount) {
    return false
  }

  const other = parent.child(nextIndex)
  const startIndex = Math.min(index, nextIndex)
  const from = childPosition(parent, $pos.start(), startIndex)
  const to = from + parent.child(startIndex).nodeSize + parent.child(startIndex + 1).nodeSize
  const replacement = index < nextIndex ? [other, node] : [node, other]

  if (dispatch) {
    dispatch(state.tr.replaceWith(from, to, replacement))
  }

  return true
}

export function normalizeBrokenImageRows(state, dispatch) {
  const ranges = []
  state.doc.descendants((node, pos) => {
    if (node.type.name !== 'boardImageRow') {
      return
    }

    const images = []
    node.forEach((child) => {
      if (child.type.name === 'image') {
        images.push(child)
      }
    })

    const intact = images.length === 2 && node.childCount === 2
    if (!intact) {
      ranges.push({ pos, node, images })
    }
  })

  if (ranges.length === 0) {
    return false
  }

  if (dispatch) {
    const tr = state.tr
    ranges.reverse().forEach(({ pos, node, images }) => {
      if (images.length === 0) {
        tr.delete(pos, pos + node.nodeSize)
        return
      }

      if (images.length === 1) {
        const image = images[0].type.create({ ...images[0].attrs, 'data-layout': 'stack' })
        tr.replaceWith(pos, pos + node.nodeSize, image)
        return
      }

      const row = node.type.create(null, images.slice(0, 2))
      const rest = images.slice(2).map((image) => image.type.create({ ...image.attrs, 'data-layout': 'stack' }))
      tr.replaceWith(pos, pos + node.nodeSize, [row, ...rest])
    })
    dispatch(tr)
  }

  return true
}
