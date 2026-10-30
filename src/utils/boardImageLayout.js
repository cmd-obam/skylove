/**
 * Board images are stored as row units in HTML:
 *   <div class="board-image-row" data-layout="stack">one img</div>
 *   <div class="board-image-row" data-layout="pair">two imgs</div>
 *
 * Legacy posts without rows keep previous display via normalizeBoardImageRows:
 * unmarked adjacent <img> pairs become pair rows; bare images become stack rows.
 */

function isStackImg(tag) {
  return /data-layout\s*=\s*["']stack["']/i.test(tag)
}

function isInsideOpenRow(before) {
  const lastOpen = before.lastIndexOf('board-image-row')
  if (lastOpen === -1) return false
  return !before.slice(lastOpen).includes('</div>')
}

function ensureStackAttr(imgTag) {
  if (isStackImg(imgTag) || /data-layout\s*=/i.test(imgTag)) {
    return imgTag
  }
  return imgTag.replace(/<img\b/i, '<img data-layout="stack"')
}

/**
 * Normalize HTML so every board image belongs to a row unit.
 * Existing board-image-row blocks are preserved.
 */
export function normalizeBoardImageRows(html) {
  if (!html || typeof html !== 'string' || !/<img\b/i.test(html)) {
    return html || ''
  }

  let result = ''
  let cursor = 0
  const source = html

  while (cursor < source.length) {
    const openIdx = source.toLowerCase().indexOf('<div', cursor)
    const imgSearch = source.slice(cursor).search(/<img\b/i)
    const nextImgAbs = imgSearch >= 0 ? cursor + imgSearch : -1

    if (openIdx !== -1 && (nextImgAbs === -1 || openIdx <= nextImgAbs)) {
      const slice = source.slice(openIdx)
      const rowMatch = slice.match(/^<div\b[^>]*\bboard-image-row\b[^>]*>[\s\S]*?<\/div>/i)
      if (rowMatch) {
        result += source.slice(cursor, openIdx) + rowMatch[0]
        cursor = openIdx + rowMatch[0].length
        continue
      }
      result += source.slice(cursor, openIdx + 4)
      cursor = openIdx + 4
      continue
    }

    if (nextImgAbs === -1) {
      result += source.slice(cursor)
      break
    }

    result += source.slice(cursor, nextImgAbs)
    const imgA = source.slice(nextImgAbs).match(/^<img\b[^>]*>/i)[0]
    const afterA = nextImgAbs + imgA.length
    const before = source.slice(0, nextImgAbs)

    if (isInsideOpenRow(before)) {
      result += imgA
      cursor = afterA
      continue
    }

    const rest = source.slice(afterA)
    const betweenAndB = rest.match(/^\s*(<img\b[^>]*>)/i)

    if (betweenAndB && !isStackImg(imgA) && !isStackImg(betweenAndB[1])) {
      const gap = rest.slice(0, betweenAndB.index)
      if (!gap.trim()) {
        const imgB = betweenAndB[1]
        result += `<div class="board-image-row" data-layout="pair">${imgA}${imgB}</div>`
        cursor = afterA + betweenAndB.index + imgB.length
        continue
      }
    }

    result += `<div class="board-image-row" data-layout="stack">${ensureStackAttr(imgA)}</div>`
    cursor = afterA
  }

  return result
}

/** Display helper used by detail pages. */
export function layoutAdjacentBoardImages(html) {
  return normalizeBoardImageRows(html)
}

/** Load helper used by the write/edit page. */
export function prepareBoardImagesForEditor(html) {
  if (!html || typeof html !== 'string') {
    return html || ''
  }
  return normalizeBoardImageRows(html)
}
