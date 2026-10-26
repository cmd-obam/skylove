import { useEffect, useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import { resolveYouTubeMedia } from '@/utils/youtube'

function stopEditorMouseDown(event) {
  event.preventDefault()
  event.stopPropagation()
}

function BoardYouTubeNodeView({ node, updateAttributes, deleteNode, editor, getPos, selected }) {
  const videoId = node.attrs.videoId || ''
  const media = videoId ? resolveYouTubeMedia(videoId) : null
  const [draft, setDraft] = useState(media?.youtubeUrl || '')
  const [message, setMessage] = useState('')
  const pos = typeof getPos === 'function' ? getPos() : null

  useEffect(() => {
    setDraft(media?.youtubeUrl || '')
  }, [media?.youtubeUrl])

  const canMove = (direction) => {
    if (typeof pos !== 'number' || !editor) {
      return false
    }

    const $pos = editor.state.doc.resolve(pos)
    const index = $pos.index()
    let cursor = index + (direction === 'up' ? -1 : 1)
    while (cursor >= 0 && cursor < $pos.parent.childCount) {
      const child = $pos.parent.child(cursor)
      if (!(child.type.name === 'paragraph' && child.content.size === 0)) {
        return true
      }
      cursor += direction === 'up' ? -1 : 1
    }
    return false
  }

  const commit = (value) => {
    const trimmed = value.trim()
    if (!trimmed) {
      if (videoId) {
        updateAttributes({ videoId: null })
      }
      setMessage('')
      return
    }

    const resolved = resolveYouTubeMedia(trimmed)
    if (!resolved) {
      setMessage('유튜브 주소만 넣을 수 있습니다.')
      return
    }

    if (resolved.videoId !== videoId) {
      updateAttributes({ videoId: resolved.videoId })
    }
    setDraft(resolved.youtubeUrl)
    setMessage('')
  }

  const move = (direction) => {
    if (typeof pos !== 'number') {
      return
    }
    editor.chain().setNodeSelection(pos).moveBoardYoutube(direction).run()
  }

  return (
    <NodeViewWrapper
      className={`board-editor-youtube${selected ? ' is-selected' : ''}`}
      data-youtube-id={videoId || undefined}
    >
      <div className="board-editor-youtube__bar" contentEditable={false}>
        <span className="board-editor-youtube__handle" data-drag-handle title="끌어서 이동">
          이동
        </span>
        <input
          type="url"
          className="board-editor-youtube__url"
          value={draft}
          placeholder="https://www.youtube.com/watch?v=..."
          aria-label="유튜브 주소"
          draggable={false}
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => {
            const next = event.target.value
            setDraft(next)
            const resolved = resolveYouTubeMedia(next)
            if (resolved) {
              commit(next)
            } else if (!next.trim()) {
              commit('')
            }
          }}
          onBlur={() => commit(draft)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit(draft)
            }
          }}
        />
        <button type="button" onMouseDown={stopEditorMouseDown} disabled={!canMove('up')} onClick={() => move('up')}>
          위
        </button>
        <button type="button" onMouseDown={stopEditorMouseDown} disabled={!canMove('down')} onClick={() => move('down')}>
          아래
        </button>
        <button type="button" onMouseDown={stopEditorMouseDown} onClick={() => deleteNode()}>
          삭제
        </button>
      </div>
      {message ? <p className="board-editor-youtube__message">{message}</p> : null}
      <div className="board-editor-youtube__preview">
        {media?.thumbnail ? (
          <img src={media.thumbnail} alt="" />
        ) : (
          <span>유튜브 주소를 입력하면 미리보기가 나타납니다.</span>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export default BoardYouTubeNodeView
