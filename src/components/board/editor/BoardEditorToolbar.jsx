import {
  FiBold,
  FiItalic,
  FiUnderline,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
  FiLink,
  FiImage,
  FiList,
  FiMinus,
  FiType,
} from 'react-icons/fi'
import { MdFormatListNumbered, MdFormatStrikethrough, MdChecklist } from 'react-icons/md'
import { BsQuote, BsCodeSlash } from 'react-icons/bs'

const FONT_SIZES = [
  { label: '기본', value: '' },
  { label: '12', value: '12px' },
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
  { label: '24', value: '24px' },
  { label: '32', value: '32px' },
]

const TEXT_COLORS = ['#1f3a5f', '#111111', '#e11d48', '#2563eb', '#059669', '#d97706', '#ffffff']
const HIGHLIGHT_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff', 'transparent']

function ToolButton({ active, disabled, onClick, title, children }) {
  return (
    <button
      type="button"
      className={`board-editor__tool${active ? ' board-editor__tool--active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  )
}

function BoardEditorToolbar({ editor, onInsertImage, uploading }) {
  if (!editor) {
    return null
  }

  const setLink = () => {
    const previous = editor.getAttributes('link').href
    const url = window.prompt('링크 URL을 입력해 주세요.', previous || 'https://')

    if (url === null) {
      return
    }

    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  const currentFontSize = editor.getAttributes('textStyle').fontSize || ''

  return (
    <div className="board-editor__toolbar" role="toolbar" aria-label="본문 서식">
      <div className="board-editor__toolbar-group">
        <ToolButton
          title="굵게"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <FiBold />
        </ToolButton>
        <ToolButton
          title="기울임"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <FiItalic />
        </ToolButton>
        <ToolButton
          title="밑줄"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <FiUnderline />
        </ToolButton>
        <ToolButton
          title="취소선"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <MdFormatStrikethrough />
        </ToolButton>
      </div>

      <div className="board-editor__toolbar-group">
        <label className="board-editor__select-wrap" title="글자 크기">
          <FiType aria-hidden="true" />
          <select
            className="board-editor__select"
            value={currentFontSize}
            onChange={(event) => {
              const value = event.target.value
              if (!value) {
                editor.chain().focus().unsetMark('textStyle').run()
                return
              }
              editor.chain().focus().setMark('textStyle', { fontSize: value }).run()
            }}
          >
            {FONT_SIZES.map((size) => (
              <option key={size.label} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
        </label>

        <label className="board-editor__color" title="글자색">
          <span>A</span>
          <input
            type="color"
            value={editor.getAttributes('textStyle').color || '#1f3a5f'}
            onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
            list="board-editor-text-colors"
          />
          <datalist id="board-editor-text-colors">
            {TEXT_COLORS.map((color) => (
              <option key={color} value={color} />
            ))}
          </datalist>
        </label>

        <label className="board-editor__color" title="배경색">
          <span>BG</span>
          <input
            type="color"
            value={editor.getAttributes('highlight').color || '#fef08a'}
            onChange={(event) =>
              editor.chain().focus().toggleHighlight({ color: event.target.value }).run()
            }
            list="board-editor-highlight-colors"
          />
          <datalist id="board-editor-highlight-colors">
            {HIGHLIGHT_COLORS.filter((c) => c !== 'transparent').map((color) => (
              <option key={color} value={color} />
            ))}
          </datalist>
        </label>
      </div>

      <div className="board-editor__toolbar-group">
        {[1, 2, 3, 4].map((level) => (
          <ToolButton
            key={level}
            title={`제목 H${level}`}
            active={editor.isActive('heading', { level })}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          >
            H{level}
          </ToolButton>
        ))}
        <ToolButton
          title="문단"
          active={editor.isActive('paragraph')}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          P
        </ToolButton>
        <ToolButton
          title="인용문"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <BsQuote />
        </ToolButton>
        <ToolButton
          title="코드블럭"
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <BsCodeSlash />
        </ToolButton>
      </div>

      <div className="board-editor__toolbar-group">
        <ToolButton
          title="글머리 목록"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <FiList />
        </ToolButton>
        <ToolButton
          title="번호 목록"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <MdFormatListNumbered />
        </ToolButton>
        <ToolButton
          title="체크리스트"
          active={editor.isActive('taskList')}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <MdChecklist />
        </ToolButton>
      </div>

      <div className="board-editor__toolbar-group">
        <ToolButton
          title="왼쪽 정렬"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <FiAlignLeft />
        </ToolButton>
        <ToolButton
          title="가운데 정렬"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <FiAlignCenter />
        </ToolButton>
        <ToolButton
          title="오른쪽 정렬"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <FiAlignRight />
        </ToolButton>
        <ToolButton title="구분선" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <FiMinus />
        </ToolButton>
        <ToolButton title="링크" active={editor.isActive('link')} onClick={setLink}>
          <FiLink />
        </ToolButton>
        <ToolButton title="이미지 삽입" disabled={uploading} onClick={onInsertImage}>
          <FiImage />
        </ToolButton>
      </div>

      {editor.isActive('image') && (
        <div className="board-editor__toolbar-group">
          <ToolButton
            title="이미지 왼쪽"
            onClick={() => editor.chain().focus().updateAttributes('image', { 'data-align': 'left' }).run()}
          >
            좌
          </ToolButton>
          <ToolButton
            title="이미지 가운데"
            onClick={() =>
              editor.chain().focus().updateAttributes('image', { 'data-align': 'center' }).run()
            }
          >
            중
          </ToolButton>
          <ToolButton
            title="이미지 오른쪽"
            onClick={() =>
              editor.chain().focus().updateAttributes('image', { 'data-align': 'right' }).run()
            }
          >
            우
          </ToolButton>
          <ToolButton
            title="이미지 작게"
            onClick={() => editor.chain().focus().updateAttributes('image', { width: '40%' }).run()}
          >
            40%
          </ToolButton>
          <ToolButton
            title="이미지 보통"
            onClick={() => editor.chain().focus().updateAttributes('image', { width: '70%' }).run()}
          >
            70%
          </ToolButton>
          <ToolButton
            title="이미지 크게"
            onClick={() => editor.chain().focus().updateAttributes('image', { width: '100%' }).run()}
          >
            100%
          </ToolButton>
          <ToolButton
            title="이미지 삭제"
            onClick={() => editor.chain().focus().deleteSelection().run()}
          >
            삭제
          </ToolButton>
        </div>
      )}
    </div>
  )
}

export default BoardEditorToolbar
