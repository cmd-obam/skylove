import { createContext, useContext, useEffect, useState } from 'react'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import BoardBlockTextSlot from '@/components/board/editor/BoardBlockTextSlot'
import { readNodePos } from '@/components/board/editor/boardBlockGaps'

export const BoardThumbnailSelectContext = createContext({
  thumbnailSrc: null,
  onSelectThumbnail: null,
})

function stopEditorMouseDown(event) {
  event.preventDefault()
  event.stopPropagation()
}

function BoardImageNodeView({ node, selected, editor, getPos }) {
  const { thumbnailSrc, onSelectThumbnail } = useContext(BoardThumbnailSelectContext)
  const src = node.attrs.src || ''
  const align = node.attrs['data-align'] || 'center'
  const width = node.attrs.width || '100%'
  const isRepresentative = Boolean(src && thumbnailSrc && src === thumbnailSrc)
  const pos = readNodePos(getPos)
  const [revision, setRevision] = useState(0)
  void revision
  let inRow = false
  if (pos != null && editor) {
    try {
      inRow = editor.state.doc.resolve(pos).parent.type.name === 'boardImageRow'
    } catch {
      inRow = false
    }
  }

  useEffect(() => {
    if (!editor) {
      return undefined
    }

    const refresh = () => setRevision((value) => value + 1)
    editor.on('transaction', refresh)
    return () => editor.off('transaction', refresh)
  }, [editor])

  const selectImage = () => {
    const currentPos = readNodePos(getPos)
    if (!editor || currentPos == null) {
      return null
    }
    return editor.chain().setNodeSelection(currentPos)
  }

  const canPair = Boolean(selected && editor && editor.can().pairWithAdjacentImage())
  const canMoveUp = Boolean(selected && editor && editor.can().moveImageBlock('up'))
  const canMoveDown = Boolean(selected && editor && editor.can().moveImageBlock('down'))

  const handleToggle = (event) => {
    event.preventDefault()
    event.stopPropagation()

    if (!onSelectThumbnail || !src) {
      return
    }

    onSelectThumbnail(isRepresentative ? null : src)
  }

  return (
    <NodeViewWrapper
      as="div"
      className={`board-editor-image${selected ? ' is-selected' : ''}${
        isRepresentative ? ' is-thumbnail' : ''
      }`}
      data-align={align}
      data-width={width}
    >
      <div className="board-editor-image__frame">
        <img
          src={src}
          alt={node.attrs.alt || ''}
          className="board-editor-image__img"
          style={{ width: inRow ? '100%' : width, height: 'auto' }}
          draggable={false}
        />
        {onSelectThumbnail ? (
          <label className="board-editor-image__thumb-toggle" contentEditable={false}>
            <input
              type="checkbox"
              checked={isRepresentative}
              onChange={handleToggle}
              onMouseDown={(event) => event.preventDefault()}
            />
            <span>대표</span>
          </label>
        ) : null}
        {selected ? (
          <div className="board-editor-image__actions" contentEditable={false}>
            <button
              type="button"
              onMouseDown={stopEditorMouseDown}
              disabled={!canPair || pos == null}
              onClick={() => selectImage()?.pairWithAdjacentImage().run()}
            >
              가로
            </button>
            <button
              type="button"
              onMouseDown={stopEditorMouseDown}
              disabled={!inRow || pos == null}
              onClick={() => selectImage()?.unpairImageRow().run()}
            >
              세로
            </button>
            <button
              type="button"
              onMouseDown={stopEditorMouseDown}
              disabled={!canMoveUp || pos == null}
              onClick={() => selectImage()?.moveImageBlock('up').run()}
            >
              위
            </button>
            <button
              type="button"
              onMouseDown={stopEditorMouseDown}
              disabled={!canMoveDown || pos == null}
              onClick={() => selectImage()?.moveImageBlock('down').run()}
            >
              아래
            </button>
            <button
              type="button"
              onMouseDown={stopEditorMouseDown}
              disabled={pos == null}
              onClick={() => selectImage()?.deleteSelection().run()}
            >
              삭제
            </button>
          </div>
        ) : null}
      </div>
      {inRow ? null : <BoardBlockTextSlot editor={editor} getPos={getPos} />}
    </NodeViewWrapper>
  )
}

export function BoardImageRowView({ editor, getPos }) {
  return (
    <NodeViewWrapper className="board-editor-image-row" data-layout="pair">
      <NodeViewContent className="board-editor-image-row__content" />
      <BoardBlockTextSlot editor={editor} getPos={getPos} />
    </NodeViewWrapper>
  )
}

export default BoardImageNodeView
