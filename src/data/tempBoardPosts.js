export const TEMP_BOARD_POSTS = {
  church_news: [
    {
      id: 'a0000001-0000-4000-8000-000000000001',
      post_type: 'church_news',
      title: '[임시] 교회소식 안내',
      content:
        '임시 게시글입니다. 추후 실제 교회소식 내용으로 업데이트됩니다.\n\n주일 예배와 교회 행사 소식을 이곳에서 안내할 예정입니다.',
      writer: '관리자',
      author: '관리자',
      authorName: '관리자',
      createdAt: '2026-03-01T09:00:00.000Z',
      date: '2026-03-01T09:00:00.000Z',
      views: 12,
      attachments: [],
      images: [],
      thumbnail: null,
      attachmentUrl: null,
      attachmentName: null,
      no: 1,
    },
  ],
  album: [
    {
      id: 'a0000001-0000-4000-8000-000000000002',
      post_type: 'album',
      title: '[임시] 교회앨범 안내',
      content:
        '임시 게시글입니다. 추후 실제 앨범 사진과 내용으로 업데이트됩니다.\n\n교회 행사와 봉사 활동 사진을 이곳에서 소개할 예정입니다.',
      writer: '관리자',
      author: '관리자',
      authorName: '관리자',
      createdAt: '2026-03-01T09:00:00.000Z',
      date: '2026-03-01T09:00:00.000Z',
      views: 12,
      attachments: [],
      images: [],
      thumbnail: null,
      attachmentUrl: null,
      attachmentName: null,
      no: 1,
    },
  ],
}

export function getTempBoardPosts(postType) {
  return TEMP_BOARD_POSTS[postType] ?? []
}

export function getTempBoardPost(postType, postId) {
  return getTempBoardPosts(postType).find((post) => String(post.id) === String(postId)) ?? null
}
