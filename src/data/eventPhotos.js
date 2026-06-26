import cleaningVolunteerImage from '@/assets/images/church-album/cleaning-volunteer.png'

export const EVENT_PHOTO_SEARCH_TYPES = [
  { value: 'title-content', label: '제목 + 내용' },
  { value: 'title', label: '제목' },
  { value: 'content', label: '내용' },
  { value: 'author', label: '작성자' },
]

export const EVENT_PHOTO_POSTS = [
  {
    id: 1,
    no: 1,
    title: '청소 봉사',
    date: '23.03.26',
    views: 1,
    content: '신방동의 한 공원에 청소 봉사왔습니다.',
    images: [
      {
        src: cleaningVolunteerImage,
        alt: '신방동 공원 청소 봉사 활동',
      },
    ],
  },
]

export function matchesEventPhotoSearch(post, query, searchType) {
  if (!query) {
    return true
  }

  switch (searchType) {
    case 'title':
      return post.title?.includes(query) ?? false
    case 'content':
      return post.content?.includes(query) ?? false
    case 'author':
      return post.author?.includes(query) ?? false
    case 'title-content':
    default:
      return (
        (post.title?.includes(query) ?? false) || (post.content?.includes(query) ?? false)
      )
  }
}

export function getEventPhotoPost(postId) {
  return EVENT_PHOTO_POSTS.find((post) => String(post.id) === String(postId)) ?? null
}

export function getAdjacentEventPhotoPosts(postId) {
  const index = EVENT_PHOTO_POSTS.findIndex((post) => String(post.id) === String(postId))

  if (index === -1) {
    return { prev: null, next: null }
  }

  return {
    prev: index > 0 ? EVENT_PHOTO_POSTS[index - 1] : null,
    next: index < EVENT_PHOTO_POSTS.length - 1 ? EVENT_PHOTO_POSTS[index + 1] : null,
  }
}
