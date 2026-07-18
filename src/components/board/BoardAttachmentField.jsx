import { useRef, useState } from 'react'
import { FiPaperclip, FiX } from 'react-icons/fi'
import {
  BOARD_ATTACHMENT_ACCEPT,
  validateBoardAttachmentFile,
} from '@/utils/boardFileValidation'

function BoardAttachmentField({ items = [], onChange, disabled = false }) {
  const inputRef = useRef(null)
  const [error, setError] = useState('')

  const handleAdd = (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''

    if (files.length === 0) {
      return
    }

    const next = [...items]
    const messages = []

    for (const file of files) {
      const validation = validateBoardAttachmentFile(file)
      if (!validation.success) {
        messages.push(`${file.name}: ${validation.message}`)
        continue
      }

      next.push({
        key: `local-${file.name}-${file.size}-${file.lastModified}`,
        file,
        name: file.name,
        size: file.size,
        mime: file.type,
        url: null,
        path: null,
      })
    }

    setError(messages[0] || '')
    onChange?.(next)
  }

  const handleRemove = (key) => {
    onChange?.(items.filter((item) => item.key !== key))
  }

  return (
    <div className="board-attach-field">
      <div className="board-attach-field__header">
        <p className="board-attach-field__label">첨부파일</p>
        <p className="board-attach-field__hint">
          다운로드용 파일입니다. 본문 이미지는 여기에 포함되지 않습니다. (PDF, PPT, ZIP, 한글 등)
        </p>
      </div>

      <button
        type="button"
        className="board-attach-field__add"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        <FiPaperclip aria-hidden="true" />
        <span>파일 추가</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={BOARD_ATTACHMENT_ACCEPT}
        className="board-attach-field__input"
        onChange={handleAdd}
        disabled={disabled}
      />

      {items.length > 0 ? (
        <ul className="board-attach-field__list">
          {items.map((item) => (
            <li key={item.key} className="board-attach-field__item">
              <span className="board-attach-field__name">{item.name}</span>
              <button
                type="button"
                className="board-attach-field__remove"
                onClick={() => handleRemove(item.key)}
                disabled={disabled}
                aria-label={`${item.name} 제거`}
              >
                <FiX />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="board-attach-field__empty">첨부된 파일이 없습니다.</p>
      )}

      {error ? <p className="board-attach-field__error">{error}</p> : null}
    </div>
  )
}

export default BoardAttachmentField
