import { createContext, useContext } from 'react'
import { NodeViewWrapper } from '@tiptap/react'

export const BoardThumbnailSelectContext = createContext({
  thumbnailSrc: null,
  onSelectThumbnail: null,
})

function BoardImageNodeView({ node, selected }) {
  const { thumbnailSrc, onSelectThumbnail } = useContext(BoardThumbnailSelectContext)
  const src = node.attrs.src || ''
  const align = node.attrs['data-align'] || 'center'
  const width = node.attrs.width || '100%'
  const isRepresentative = Boolean(src && thumbnailSrc && src === thumbnailSrc)

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
    >
      <div className="board-editor-image__frame">
        <img
          src={src}
          alt={node.attrs.alt || ''}
          className="board-editor-image__img"
          style={{ width, height: 'auto' }}
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
      </div>
    </NodeViewWrapper>
  )
}

export default BoardImageNodeView
