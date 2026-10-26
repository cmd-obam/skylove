import { mergeAttributes, Node } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { Plugin } from '@tiptap/pm/state'
import BoardImageNodeView, { BoardImageRowView } from '@/components/board/editor/BoardImageNodeView'
import BoardYouTubeNodeView from '@/components/board/editor/BoardYouTubeNodeView'
import {
  moveImageBlock,
  normalizeBrokenImageRows,
  pairWithAdjacentImage,
  unpairImageRow,
} from '@/components/board/editor/boardImageCommands'
import { moveBoardYoutube } from '@/components/board/editor/boardYoutubeCommands'

const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) {
            return {}
          }

          return {
            style: `font-size: ${attributes.fontSize}`,
          }
        },
      },
    }
  },
})

const ResizableImage = Image.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width') || element.style.width || null,
        renderHTML: (attributes) => {
          if (!attributes.width) {
            return {}
          }

          return {
            width: attributes.width,
            style: `width: ${attributes.width}; height: auto;`,
          }
        },
      },
      'data-align': {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes) => ({
          'data-align': attributes['data-align'] || 'center',
          style: `display: block; margin: 0.75rem ${
            attributes['data-align'] === 'left'
              ? '0 auto 0 0'
              : attributes['data-align'] === 'right'
                ? '0 0 0 auto'
                : '0.75rem auto'
          }; max-width: 100%; height: auto;`,
        }),
      },
      'data-layout': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-layout') || null,
        renderHTML: (attributes) => {
          if (!attributes['data-layout']) {
            return {}
          }

          return { 'data-layout': attributes['data-layout'] }
        },
      },
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      pairWithAdjacentImage:
        () =>
        ({ state, dispatch }) =>
          pairWithAdjacentImage(state, dispatch),
      unpairImageRow:
        () =>
        ({ state, dispatch }) =>
          unpairImageRow(state, dispatch),
      moveImageBlock:
        (direction) =>
        ({ state, dispatch }) =>
          moveImageBlock(state, dispatch, direction),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(BoardImageNodeView)
  },
})

const BoardImageRow = Node.create({
  name: 'boardImageRow',
  group: 'block',
  content: 'image{1,2}',
  defining: true,
  isolating: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'div.board-image-row' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'board-image-row', 'data-layout': 'pair' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(BoardImageRowView)
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, _oldState, state) {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null
          }

          let next = null
          if (normalizeBrokenImageRows(state, (tr) => {
            next = tr
          })) {
            return next
          }

          return null
        },
      }),
    ]
  },
})

const BoardVideo = Node.create({
  name: 'boardVideo',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      title: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'video[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(HTMLAttributes, {
        controls: 'true',
        playsinline: 'true',
        preload: 'metadata',
        class: 'board-editor-video',
      }),
    ]
  },
})

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

const BoardYouTube = Node.create({
  name: 'boardYoutube',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      videoId: {
        default: null,
        parseHTML: (element) => {
          const id = element.getAttribute('data-youtube-id') || ''
          return YOUTUBE_ID.test(id) ? id : null
        },
        renderHTML: (attributes) => {
          if (!YOUTUBE_ID.test(attributes.videoId || '')) {
            return {}
          }

          return { 'data-youtube-id': attributes.videoId }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div.board-youtube' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'board-youtube' })]
  },

  addCommands() {
    return {
      insertBoardYoutube:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
      moveBoardYoutube:
        (direction) =>
        ({ state, dispatch }) =>
          moveBoardYoutube(state, dispatch, direction),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(BoardYouTubeNodeView)
  },
})

export function createBoardEditorExtensions({ placeholder } = {}) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      horizontalRule: false,
      codeBlock: {
        HTMLAttributes: {
          class: 'board-editor__code-block',
        },
      },
    }),
    Underline,
    FontSize,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        rel: 'noopener noreferrer',
        target: '_blank',
      },
    }),
    ResizableImage.configure({
      inline: false,
      allowBase64: false,
    }),
    BoardImageRow,
    BoardVideo,
    BoardYouTube,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    HorizontalRule,
    Placeholder.configure({
      placeholder: placeholder || '내용을 입력해 주세요.',
    }),
  ]
}
