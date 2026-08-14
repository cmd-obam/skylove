import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import BoardEditorToolbar from '@/components/board/editor/BoardEditorToolbar'
import { createBoardEditorExtensions } from '@/components/board/editor/boardEditorExtensions'
import {
  BoardThumbnailSelectContext,
} from '@/components/board/editor/BoardImageNodeView'
import { validateBoardImageFile } from '@/utils/boardFileValidation'
import './BoardRichEditor.css'

function BoardRichEditor({
  value = '',
  onChange,
  onUploadImage,
  thumbnailSrc = null,
  onSelectThumbnail,
  placeholder = '내용을 입력해 주세요.',
  disabled = false,
}) {
  const fileInputRef = useRef(null)
  const editorRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const thumbnailContextValue = useMemo(
    () => ({
      thumbnailSrc,
      onSelectThumbnail: onSelectThumbnail ?? null,
    }),
    [thumbnailSrc, onSelectThumbnail],
  )

  const uploadAndInsert = useCallback(
    async (editorInstance, file) => {
      if (!file || !onUploadImage || !editorInstance) {
        return
      }

      const validation = validateBoardImageFile(file)
      if (!validation.success) {
        setError(validation.message)
        return
      }

      setUploading(true)
      setError('')

      try {
        const result = await onUploadImage(file)

        if (!result?.success || !result.url) {
          setError(result?.message || '이미지 업로드에 실패했습니다.')
          return
        }

        editorInstance
          .chain()
          .focus()
          .setImage({
            src: result.url,
            alt: file.name,
            width: '100%',
            'data-align': 'center',
          })
          .run()
      } catch (uploadError) {
        setError(uploadError.message || '이미지 업로드에 실패했습니다.')
      } finally {
        setUploading(false)
      }
    },
    [onUploadImage],
  )

  const editor = useEditor({
    extensions: createBoardEditorExtensions({ placeholder }),
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor: current }) => {
      onChangeRef.current?.(current.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'board-editor__content',
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || [])
        const imageItem = items.find((item) => item.type.startsWith('image/'))
        const currentEditor = editorRef.current

        if (!imageItem || !currentEditor) {
          return false
        }

        const file = imageItem.getAsFile()
        if (!file) {
          return false
        }

        event.preventDefault()
        uploadAndInsert(currentEditor, file)
        return true
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files || [])
        const imageFile = files.find((file) => file.type.startsWith('image/'))
        const currentEditor = editorRef.current

        if (!imageFile || !currentEditor) {
          return false
        }

        event.preventDefault()
        uploadAndInsert(currentEditor, imageFile)
        return true
      },
    },
  })

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  useEffect(() => {
    if (!editor) {
      return
    }

    const current = editor.getHTML()
    if (value !== current && value !== undefined) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [editor, value])

  useEffect(() => {
    if (!editor) {
      return
    }

    editor.setEditable(!disabled)
  }, [editor, disabled])

  const handleInsertImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !editor) {
      return
    }

    await uploadAndInsert(editor, file)
  }

  return (
    <BoardThumbnailSelectContext.Provider value={thumbnailContextValue}>
      <div className={`board-editor${disabled ? ' board-editor--disabled' : ''}`}>
        <BoardEditorToolbar
          editor={editor}
          onInsertImage={handleInsertImageClick}
          uploading={uploading}
        />
        <EditorContent editor={editor} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="board-editor__file-input"
          onChange={handleFileChange}
        />
        {uploading ? <p className="board-editor__status">이미지 업로드 중…</p> : null}
        {error ? <p className="board-editor__error">{error}</p> : null}
      </div>
    </BoardThumbnailSelectContext.Provider>
  )
}

export default BoardRichEditor
