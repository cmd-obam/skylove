import { focusOrInsertParagraphAfter, readNodePos } from '@/components/board/editor/boardBlockGaps'

function BoardBlockTextSlot({ editor, getPos }) {
  const insertText = (event) => {
    event.preventDefault()
    event.stopPropagation()

    const pos = readNodePos(getPos)
    if (!editor || pos == null) {
      return
    }

    const tr = focusOrInsertParagraphAfter(editor.state, pos, '')
    if (!tr) {
      return
    }

    editor.view.dispatch(tr)
    editor.view.focus()
  }

  return (
    <button
      type="button"
      className="board-editor-block__text-slot"
      contentEditable={false}
      onMouseDownCapture={insertText}
    >
      글 입력
    </button>
  )
}

export default BoardBlockTextSlot
