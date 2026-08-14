import { useRef, useState } from 'react'
import { FiImage, FiX } from 'react-icons/fi'
import { BOARD_IMAGE_ACCEPT, validateBoardImageFile } from '@/utils/boardFileValidation'

function BoardThumbnailField({ value, onChange, disabled = false }) {
  const inputRef = useRef(null)
  const [error, setError] = useState('')

  const handlePick = () => {
    inputRef.current?.click()
  }

  const handleChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const validation = validateBoardImageFile(file)
    if (!validation.success) {
      setError(validation.message)
      return
    }

    setError('')
    onChange?.({
      file,
      previewUrl: URL.createObjectURL(file),
      existingUrl: null,
      existingPath: null,
      fromContent: false,
    })
  }

  const handleClear = () => {
    if (value?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(value.previewUrl)
    }

    setError('')
    onChange?.(null)
  }

  const preview = value?.previewUrl || value?.existingUrl || null

  return (
    <div className="board-thumb-field">
      <div className="board-thumb-field__header">
        <p className="board-thumb-field__label">대표이미지</p>
        <p className="board-thumb-field__hint">
          본문 이미지 우상단 &quot;대표&quot; 체크 또는 직접 업로드. 미지정 시 본문 첫 이미지가
          사용됩니다.
        </p>
      </div>

      {preview ? (
        <div className="board-thumb-field__preview-wrap">
          <img src={preview} alt="대표이미지 미리보기" className="board-thumb-field__preview" />
          <button
            type="button"
            className="board-thumb-field__remove"
            onClick={handleClear}
            disabled={disabled}
            aria-label="대표이미지 제거"
          >
            <FiX />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="board-thumb-field__empty"
          onClick={handlePick}
          disabled={disabled}
        >
          <FiImage aria-hidden="true" />
          <span>대표이미지 업로드</span>
        </button>
      )}

      {preview ? (
        <button
          type="button"
          className="board-thumb-field__change"
          onClick={handlePick}
          disabled={disabled}
        >
          이미지 변경
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={BOARD_IMAGE_ACCEPT}
        className="board-thumb-field__input"
        onChange={handleChange}
        disabled={disabled}
      />
      {error ? <p className="board-thumb-field__error">{error}</p> : null}
    </div>
  )
}

export default BoardThumbnailField
