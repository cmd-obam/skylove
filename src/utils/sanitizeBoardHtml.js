import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'h1',
  'h2',
  'h3',
  'h4',
  'blockquote',
  'pre',
  'code',
  'ul',
  'ol',
  'li',
  'hr',
  'a',
  'img',
  'video',
  'span',
  'div',
  'label',
  'input',
]

const ALLOWED_ATTR = [
  'href',
  'target',
  'rel',
  'src',
  'alt',
  'title',
  'width',
  'height',
  'style',
  'class',
  'data-align',
  'type',
  'checked',
  'disabled',
  'controls',
  'playsinline',
  'preload',
  'poster',
]

const BOARD_VIDEO_SRC = /\/storage\/v1\/object\/public\/board-uploads\//i

DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  if (String(node.nodeName).toLowerCase() !== 'video' || data.attrName !== 'src') {
    return
  }

  if (!BOARD_VIDEO_SRC.test(String(data.attrValue || ''))) {
    data.keepAttr = false
  }
})

/**
 * Sanitize board HTML for safe storage and display.
 * Plain-text legacy content is escaped and wrapped in <p>.
 */
export function sanitizeBoardHtml(html) {
  if (!html) {
    return ''
  }

  const value = String(html)

  if (!/[<>]/.test(value)) {
    const escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

    return escaped
      .split(/\n{2,}/)
      .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`)
      .join('')
  }

  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
  })
}

/**
 * 연속된 이미지 2장을 가로 배치용 래퍼로 묶습니다.
 * 이미 board-image-row 안에 있으면 다시 묶지 않습니다.
 * 예: img1+img2 가로, img3는 단독(세로) 유지
 */
export function layoutAdjacentBoardImages(html) {
  if (!html || typeof html !== 'string' || !/<img\b/i.test(html)) {
    return html
  }

  return html.replace(/(<img\b[^>]*>)\s*(<img\b[^>]*>)/gi, (match, imgA, imgB, offset, full) => {
    const before = full.slice(0, offset)
    const lastOpen = before.lastIndexOf('board-image-row')
    if (lastOpen !== -1) {
      const afterOpen = before.slice(lastOpen)
      if (!afterOpen.includes('</div>')) {
        return match
      }
    }

    return `<div class="board-image-row">${imgA}${imgB}</div>`
  })
}

export function isBoardHtmlEmpty(html) {
  if (!html) {
    return true
  }

  const value = String(html)

  // 본문에 이미지나 동영상만 있어도 내용이 있는 것으로 봅니다.
  if (/<(img|video)\b/i.test(value)) {
    return false
  }

  const text = value
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, '')
    .trim()

  return text.length === 0
}
