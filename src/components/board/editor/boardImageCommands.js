import { NodeSelection } from '@tiptap/pm/state'

function isSkippableGap(node) {
  return node.type.name === 'paragraph' && node.content.size === 0
}

function childPosition(parent, parentStart, index) {
  let pos = parentStart
  for (let i = 0; i < index; i += 1) {
    pos += parent.child(i).nodeSize
  }
  return pos
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

function imageAttrs(image, layout = 'stack') {
  return image.type.create({
    ...image.attrs,
    'data-layout': layout,
  })
}

function createStackRow(state, image) {
  return state.schema.nodes.boardImageRow.create(
    { 'data-layout': 'stack' },
    imageAttrs(image, 'stack'),
  )
}

function createPairRow(state, first, second) {
  return state.schema.nodes.boardImageRow.create(
    { 'data-layout': 'pair' },
    [imageAttrs(first, 'stack'), imageAttrs(second, 'stack')],
  )
}

/**
 * The movable unit for an image: the surrounding boardImageRow when present,
 * otherwise the bare image itself (legacy docs).
 */
function imageBlockUnit(state, selected) {
  if (selected.parent.type.name === 'boardImageRow') {
    const rowPos = selected.$pos.before()
    return {
      kind: 'row',
      pos: rowPos,
      node: selected.parent,
      parent: state.doc.resolve(rowPos).parent,
      index: state.doc.resolve(rowPos).index(),
      $pos: state.doc.resolve(rowPos),
      image: selected.node,
      imageIndex: selected.index,
    }
  }

  return {
    kind: 'image',
    pos: selected.pos,
    node: selected.node,
    parent: selected.parent,
    index: selected.index,
    $pos: selected.$pos,
    image: selected.node,
    imageIndex: 0,
  }
}

function neighborBlockIndex(parent, index, direction) {
  let cursor = index + direction
  while (cursor >= 0 && cursor < parent.childCount) {
    const child = parent.child(cursor)
    if (child.type.name === 'boardImageRow' || child.type.name === 'image') {
      return cursor
    }
    if (!isSkippableGap(child)) {
      return -1
    }
    cursor += direction
  }
  return -1
}

function rowImages(node) {
  const images = []
  if (node.type.name === 'image') {
    images.push(node)
    return images
  }
  node.forEach((child) => {
    if (child.type.name === 'image') images.push(child)
  })
  return images
}

export function pairWithAdjacentImage(state, dispatch) {
  const selected = selectedImage(state)
  if (!selected) return false

  const unit = imageBlockUnit(state, selected)
  if (unit.kind === 'row' && unit.node.childCount >= 2) {
    return false
  }

  const { parent, index, $pos } = unit
  const nextIndex = neighborBlockIndex(parent, index, 1)
  const previousIndex = neighborBlockIndex(parent, index, -1)

  let firstIndex = -1
  let secondIndex = -1
  if (nextIndex >= 0) {
    firstIndex = index
    secondIndex = nextIndex
  } else if (previousIndex >= 0) {
    firstIndex = previousIndex
    secondIndex = index
  }
  if (firstIndex < 0 || secondIndex < 0) return false

  const firstNode = parent.child(firstIndex)
  const secondNode = parent.child(secondIndex)
  const firstImages = rowImages(firstNode)
  const secondImages = rowImages(secondNode)
  if (firstImages.length !== 1 || secondImages.length !== 1) return false

  const from = childPosition(parent, $pos.start(), firstIndex)
  const to = childPosition(parent, $pos.start(), secondIndex) + secondNode.nodeSize
  const row = createPairRow(state, firstImages[0], secondImages[0])

  if (dispatch) {
    const tr = state.tr.replaceWith(from, to, row)
    const imagePos = from + 1
    if (tr.doc.nodeAt(imagePos)?.type.name === 'image') {
      tr.setSelection(NodeSelection.create(tr.doc, imagePos))
    }
    dispatch(tr.scrollIntoView())
  }

  return true
}

export function unpairImageRow(state, dispatch) {
  const selected = selectedImage(state)
  if (!selected || selected.parent.type.name !== 'boardImageRow') {
    return false
  }

  const row = selected.parent
  if (row.childCount < 2) return false

  const rowPos = selected.$pos.before()
  const images = rowImages(row).map((image) => createStackRow(state, image))
  if (images.length === 0) return false

  if (dispatch) {
    dispatch(state.tr.replaceWith(rowPos, rowPos + row.nodeSize, images).scrollIntoView())
  }

  return true
}

/**
 * Move the whole image row (or bare image) among document blocks.
 * Inside a pair row, up/down swaps the two images so authors can change column order.
 */
export function moveImageBlock(state, dispatch, direction) {
  const selected = selectedImage(state)
  if (!selected) return false

  if (selected.parent.type.name === 'boardImageRow' && selected.parent.childCount === 2) {
    const row = selected.parent
    const rowPos = selected.$pos.before()
    const otherIndex = direction === 'up' ? selected.index - 1 : selected.index + 1
    if (otherIndex < 0 || otherIndex >= row.childCount) {
      // At the edge of the pair: move the whole row among document siblings.
      return moveRowAmongBlocks(state, dispatch, rowPos, row, direction)
    }

    const first = row.child(Math.min(selected.index, otherIndex))
    const second = row.child(Math.max(selected.index, otherIndex))
    const replacement =
      selected.index < otherIndex
        ? createPairRow(state, second, first)
        : createPairRow(state, first, second)

    if (dispatch) {
      const tr = state.tr.replaceWith(rowPos, rowPos + row.nodeSize, replacement)
      const imagePos = rowPos + 1 + (selected.index < otherIndex ? second.nodeSize : 0)
      if (tr.doc.nodeAt(imagePos)?.type.name === 'image') {
        tr.setSelection(NodeSelection.create(tr.doc, imagePos))
      }
      dispatch(tr.scrollIntoView())
    }
    return true
  }

  const unit = imageBlockUnit(state, selected)
  return moveRowAmongBlocks(state, dispatch, unit.pos, unit.node, direction)
}

function moveRowAmongBlocks(state, dispatch, pos, node, direction) {
  const $pos = state.doc.resolve(pos)
  const parent = $pos.parent
  const index = $pos.index()
  const nextIndex = direction === 'up' ? index - 1 : index + 1
  if (nextIndex < 0 || nextIndex >= parent.childCount) {
    return false
  }

  const other = parent.child(nextIndex)
  const startIndex = Math.min(index, nextIndex)
  const from = childPosition(parent, $pos.start(), startIndex)
  const to = from + parent.child(startIndex).nodeSize + parent.child(startIndex + 1).nodeSize
  const moving = node
  const replacement = index < nextIndex ? [other, moving] : [moving, other]

  if (dispatch) {
    const tr = state.tr.replaceWith(from, to, replacement)
    const nodePos = index < nextIndex ? from + other.nodeSize : from
    const selectedNode = tr.doc.resolve(nodePos).nodeAfter
    if (selectedNode?.type.name === 'boardImageRow') {
      const imagePos = nodePos + 1
      if (tr.doc.nodeAt(imagePos)?.type.name === 'image') {
        tr.setSelection(NodeSelection.create(tr.doc, imagePos))
      }
    } else if (selectedNode && NodeSelection.isSelectable(selectedNode)) {
      tr.setSelection(NodeSelection.create(tr.doc, nodePos))
    }
    dispatch(tr.scrollIntoView())
  }

  return true
}

export function normalizeBrokenImageRows(state, dispatch) {
  const ranges = []
  const bareImages = []

  state.doc.descendants((node, pos) => {
    if (node.type.name !== 'boardImageRow') return
    const images = rowImages(node)
    const layout = node.attrs['data-layout'] || (images.length >= 2 ? 'pair' : 'stack')
    const intact =
      (layout === 'pair' && images.length === 2 && node.childCount === 2) ||
      (layout === 'stack' && images.length === 1 && node.childCount === 1)
    if (!intact) {
      ranges.push({ pos, node, images })
    }
  })

  state.doc.forEach((child, offset) => {
    if (child.type.name === 'image') {
      bareImages.push({ pos: offset, node: child })
    }
  })

  if (ranges.length === 0 && bareImages.length === 0) return false

  if (dispatch) {
    const tr = state.tr
    ranges.reverse().forEach(({ pos, node, images }) => {
      if (images.length === 0) {
        tr.delete(pos, pos + node.nodeSize)
        return
      }
      if (images.length === 1) {
        tr.replaceWith(pos, pos + node.nodeSize, createStackRow(state, images[0]))
        return
      }
      const pair = createPairRow(state, images[0], images[1])
      const rest = images.slice(2).map((image) => createStackRow(state, image))
      tr.replaceWith(pos, pos + node.nodeSize, [pair, ...rest])
    })
    bareImages
      .slice()
      .sort((a, b) => b.pos - a.pos)
      .forEach(({ pos }) => {
        const current = tr.doc.nodeAt(pos)
        if (!current || current.type.name !== 'image') return
        if (tr.doc.resolve(pos).parent.type.name === 'boardImageRow') return
        tr.replaceWith(pos, pos + current.nodeSize, createStackRow(state, current))
      })
    dispatch(tr)
  }

  return true
}

export function insertBoardImageRow(state, dispatch, attrs = {}) {
  const rowType = state.schema.nodes.boardImageRow
  const imageType = state.schema.nodes.image
  if (!rowType || !imageType) return false

  const image = imageType.create({
    src: attrs.src,
    alt: attrs.alt || '',
    width: attrs.width || '100%',
    'data-align': attrs['data-align'] || 'center',
    'data-layout': 'stack',
  })
  const row = rowType.create({ 'data-layout': 'stack' }, image)
  const paragraph = state.schema.nodes.paragraph.create()

  if (dispatch) {
    const from = state.selection.from
    let tr = state.tr.replaceSelectionWith(row)
    const insertAt = tr.selection.from
    tr = tr.insert(insertAt, paragraph)
    dispatch(tr.scrollIntoView())
    void from
  }
  return true
}
