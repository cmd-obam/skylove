import { useEffect, useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import BoardBlockTextSlot from '@/components/board/editor/BoardBlockTextSlot'
import { readNodePos } from '@/components/board/editor/boardBlockGaps'
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
  const [revision, setRevision] = useState(0)
  const pos = readNodePos(getPos)
  void revision

  useEffect(() => {
    setDraft(media?.youtubeUrl || '')
  }, [media?.youtubeUrl])

  useEffect(() => {
    if (!editor) {
      return undefined
    }

    const refresh = () => setRevision((value) => value + 1)
    editor.on('transaction', refresh)
    return () => editor.off('transaction', refresh)
  }, [editor])

  const canMove = (direction) => {
    if (pos == null || !editor) {
      return false
    }

    let $pos
    try {
      $pos = editor.state.doc.resolve(pos)
    } catch {
      return false
    }

    const nextIndex = $pos.index() + (direction === 'up' ? -1 : 1)
    return nextIndex >= 0 && nextIndex < $pos.parent.childCount
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
    const currentPos = readNodePos(getPos)
    if (currentPos == null) {
      return
    }
    editor.chain().setNodeSelection(currentPos).moveBoardYoutube(direction).run()
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
        <button
          type="button"
          onMouseDown={stopEditorMouseDown}
          disabled={!canMove('up')}
          onClick={() => move('up')}
        >
          위
        </button>
        <button
          type="button"
          onMouseDown={stopEditorMouseDown}
          disabled={!canMove('down')}
          onClick={() => move('down')}
        >
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
      <BoardBlockTextSlot editor={editor} getPos={getPos} />
    </NodeViewWrapper>
  )
}

export default BoardYouTubeNodeView
