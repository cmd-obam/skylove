import { createContext, useContext } from 'react'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'

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
  const pos = typeof getPos === 'function' ? getPos() : null
  const inRow = typeof pos === 'number' && editor?.state.doc.resolve(pos).parent.type.name === 'boardImageRow'
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
              disabled={!canPair || typeof pos !== 'number'}
              onClick={() => editor.chain().setNodeSelection(pos).pairWithAdjacentImage().run()}
            >
              가로
            </button>
            <button
              type="button"
              onMouseDown={stopEditorMouseDown}
              disabled={!inRow || typeof pos !== 'number'}
              onClick={() => editor.chain().setNodeSelection(pos).unpairImageRow().run()}
            >
              세로
            </button>
            <button
              type="button"
              onMouseDown={stopEditorMouseDown}
              disabled={!canMoveUp || typeof pos !== 'number'}
              onClick={() => editor.chain().setNodeSelection(pos).moveImageBlock('up').run()}
            >
              위
            </button>
            <button
              type="button"
              onMouseDown={stopEditorMouseDown}
              disabled={!canMoveDown || typeof pos !== 'number'}
              onClick={() => editor.chain().setNodeSelection(pos).moveImageBlock('down').run()}
            >
              아래
            </button>
            <button
              type="button"
              onMouseDown={stopEditorMouseDown}
              disabled={typeof pos !== 'number'}
              onClick={() => editor.chain().setNodeSelection(pos).deleteSelection().run()}
            >
              삭제
            </button>
          </div>
        ) : null}
      </div>
    </NodeViewWrapper>
  )
}

export function BoardImageRowView() {
  return (
    <NodeViewWrapper className="board-editor-image-row" data-layout="pair">
      <NodeViewContent className="board-editor-image-row__content" />
    </NodeViewWrapper>
  )
}

export default BoardImageNodeView
