/**
 * 표시용 이미지 배치.
 * data-layout="stack" 이 없는 기존 연속 이미지는 지금처럼 두 장씩 가로로 유지합니다.
 * 새로 올린 세로 이미지와 작성자가 저장한 가로 행은 그대로 둡니다.
 */
export function layoutAdjacentBoardImages(html) {
  if (!html || typeof html !== 'string' || !/<img\b/i.test(html)) {
    return html
  }

  return html.replace(/(<img\b[^>]*>)\s*(<img\b[^>]*>)/gi, (match, imgA, imgB, offset, full) => {
    if (/data-layout\s*=\s*["']stack["']/i.test(imgA) || /data-layout\s*=\s*["']stack["']/i.test(imgB)) {
      return match
    }

    const before = full.slice(0, offset)
    const lastOpen = before.lastIndexOf('board-image-row')
    if (lastOpen !== -1) {
      const afterOpen = before.slice(lastOpen)
      if (!afterOpen.includes('</div>')) {
        return match
      }
    }

    return `<div class="board-image-row" data-layout="pair">${imgA}${imgB}</div>`
  })
}

export function prepareBoardImagesForEditor(html) {
  if (!html || typeof html !== 'string') {
    return html || ''
  }

  if (/board-image-row|data-layout\s*=/i.test(html)) {
    return html
  }

  return layoutAdjacentBoardImages(html)
}
