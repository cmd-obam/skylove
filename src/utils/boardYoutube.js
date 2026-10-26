const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

export function hasBoardYouTubeEmbed(html) {
  return /data-youtube-id\s*=\s*["'][A-Za-z0-9_-]{11}["']/i.test(String(html || ''))
}

export function renderBoardYouTubeEmbeds(html) {
  if (!html || !html.includes('board-youtube')) {
    return html
  }

  return html.replace(/<div\b[^>]*\bboard-youtube\b[^>]*>[\s\S]*?<\/div>/gi, (block) => {
    const matched = block.match(/data-youtube-id=(?:"([A-Za-z0-9_-]{11})"|'([A-Za-z0-9_-]{11})')/i)
    const videoId = matched?.[1] || matched?.[2]

    if (!videoId || !YOUTUBE_ID.test(videoId)) {
      return '<p class="board-youtube board-youtube--invalid">유튜브 주소를 확인할 수 없습니다.</p>'
    }

    return `<div class="board-youtube"><iframe src="https://www.youtube.com/embed/${videoId}?rel=0" title="유튜브 영상" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen="true"></iframe></div>`
  })
}
