import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import BoardEditorToolbar from '@/components/board/editor/BoardEditorToolbar'
import { createBoardEditorExtensions } from '@/components/board/editor/boardEditorExtensions'
import {
  BoardThumbnailSelectContext,
} from '@/components/board/editor/BoardImageNodeView'
import { focusOrInsertParagraphAfter, isBoardEditorChromeEvent, MEDIA_BLOCK_TYPES } from '@/components/board/editor/boardBlockGaps'
import {
  BOARD_IMAGE_ACCEPT,
  BOARD_VIDEO_ACCEPT,
  validateBoardImageFile,
  validateBoardVideoFile,
} from '@/utils/boardFileValidation'
import './BoardRichEditor.css'

function BoardRichEditor({
  value = '',
  onChange,
  onUploadImage,
  onUploadVideo,
  thumbnailSrc = null,
  onSelectThumbnail,
  placeholder = '내용을 입력해 주세요.',
  disabled = false,
}) {
  const fileInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const editorRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadKind, setUploadKind] = useState('image')
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
    async (editorInstance, file, kind = 'image') => {
      const isVideo = kind === 'video'
      const upload = isVideo ? onUploadVideo : onUploadImage

      if (!file || !upload || !editorInstance) {
        return
      }

      const validation = isVideo ? validateBoardVideoFile(file) : validateBoardImageFile(file)
      if (!validation.success) {
        setError(validation.message)
        return
      }

      setUploadKind(kind)
      setUploading(true)
      setError('')

      try {
        const result = await upload(file)

        if (!result?.success || !result.url) {
          setError(result?.message || (isVideo ? '동영상 업로드에 실패했습니다.' : '이미지 업로드에 실패했습니다.'))
          return
        }

        if (isVideo) {
          editorInstance
            .chain()
            .focus()
            .insertContent({
              type: 'boardVideo',
              attrs: { src: result.url, title: file.name },
            })
            .run()
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
            'data-layout': 'stack',
          })
          .run()
      } catch (uploadError) {
        setError(uploadError.message || (isVideo ? '동영상 업로드에 실패했습니다.' : '이미지 업로드에 실패했습니다.'))
      } finally {
        setUploading(false)
      }
    },
    [onUploadImage, onUploadVideo],
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
      handleKeyDown: (view, event) => {
        if (isBoardEditorChromeEvent(event)) {
          return false
        }

        const { selection } = view.state
        if (!(selection instanceof NodeSelection) || !MEDIA_BLOCK_TYPES.has(selection.node.type.name)) {
          return false
        }

        if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) {
          return false
        }

        if (event.key !== 'Enter' && event.key !== 'Process' && event.key !== 'Unidentified' && event.key.length !== 1) {
          return false
        }

        const typed = event.key.length === 1 && event.key !== 'Process' && event.key !== 'Unidentified' ? event.key : ''
        const tr = focusOrInsertParagraphAfter(view.state, selection.from, typed)
        if (!tr) {
          return false
        }

        event.preventDefault()
        view.dispatch(tr)
        return true
      },
      handleDOMEvents: {
        compositionend: (view, event) => {
          if (isBoardEditorChromeEvent(event)) {
            return false
          }

          const { selection } = view.state
          const text = event.data || ''
          if (!text || !(selection instanceof NodeSelection) || !MEDIA_BLOCK_TYPES.has(selection.node.type.name)) {
            return false
          }

          const tr = focusOrInsertParagraphAfter(view.state, selection.from, text)
          if (!tr) {
            return false
          }

          view.dispatch(tr)
          return true
        },
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || [])
        const videoItem = items.find((item) => item.type.startsWith('video/'))
        const imageItem = items.find((item) => item.type.startsWith('image/'))
        const currentEditor = editorRef.current
        const mediaItem = videoItem || imageItem

        if (!mediaItem || !currentEditor) {
          return false
        }

        const file = mediaItem.getAsFile()
        if (!file) {
          return false
        }

        event.preventDefault()
        uploadAndInsert(currentEditor, file, videoItem ? 'video' : 'image')
        return true
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files || [])
        const videoFile = files.find((file) => file.type.startsWith('video/'))
        const imageFile = files.find((file) => file.type.startsWith('image/'))
        const currentEditor = editorRef.current
        const mediaFile = videoFile || imageFile

        if (!mediaFile || !currentEditor) {
          return false
        }

        event.preventDefault()
        uploadAndInsert(currentEditor, mediaFile, videoFile ? 'video' : 'image')
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

  const handleInsertVideoClick = () => {
    videoInputRef.current?.click()
  }

  const handleFileChange = async (event, kind) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !editor) {
      return
    }

    await uploadAndInsert(editor, file, kind)
  }

  return (
    <BoardThumbnailSelectContext.Provider value={thumbnailContextValue}>
      <div className={`board-editor${disabled ? ' board-editor--disabled' : ''}`}>
        <BoardEditorToolbar
          editor={editor}
          onInsertImage={handleInsertImageClick}
          onInsertVideo={handleInsertVideoClick}
          uploading={uploading}
        />
        <EditorContent editor={editor} />
        <input
          ref={fileInputRef}
          type="file"
          accept={BOARD_IMAGE_ACCEPT}
          className="board-editor__file-input"
          onChange={(event) => handleFileChange(event, 'image')}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept={BOARD_VIDEO_ACCEPT}
          className="board-editor__file-input"
          onChange={(event) => handleFileChange(event, 'video')}
        />
        {uploading ? (
          <p className="board-editor__status">
            {uploadKind === 'video' ? '동영상 업로드 중…' : '이미지 업로드 중…'}
          </p>
        ) : null}
        {error ? <p className="board-editor__error">{error}</p> : null}
      </div>
    </BoardThumbnailSelectContext.Provider>
  )
}

export default BoardRichEditor
