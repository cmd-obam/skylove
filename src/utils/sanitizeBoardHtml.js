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
]

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

export function isBoardHtmlEmpty(html) {
  if (!html) {
    return true
  }

  const value = String(html)

  // 본문에 이미지만 있어도 내용이 있는 것으로 봅니다.
  if (/<img\b/i.test(value)) {
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
