export const PRAYER_TITLE_MAX = 120
export const PRAYER_CONTENT_MAX = 4000

export const PRAYER_CATEGORIES = [
  { id: 'personal', label: '개인' },
  { id: 'family', label: '가정' },
  { id: 'health', label: '건강' },
  { id: 'church', label: '교회' },
  { id: 'mission', label: '선교' },
  { id: 'other', label: '기타' },
]

export const PRAYER_CATEGORY_FILTERS = [{ id: 'all', label: '전체' }, ...PRAYER_CATEGORIES]

export const PRAYER_STATUS_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'praying', label: '기도 중' },
  { id: 'answered', label: '응답 완료' },
]

export const PRAYER_VISIBILITY_FILTERS = [
  { id: 'all', label: '전체 공개범위' },
  { id: 'public', label: '회원 공개' },
  { id: 'private', label: '비공개' },
]

const CATEGORY_LABELS = Object.fromEntries(PRAYER_CATEGORIES.map((item) => [item.id, item.label]))

export function prayerCategoryLabel(category) {
  return CATEGORY_LABELS[category] ?? '기타'
}

export function prayerStatusLabel(status) {
  return status === 'answered' ? '응답 완료' : '기도 중'
}

export function prayerVisibilityLabel(visibility) {
  return visibility === 'private' ? '비공개' : '회원 공개'
}

export function prayerAuthorLabel(prayer) {
  if (!prayer) {
    return '회원'
  }

  if (prayer.isAnonymous) {
    if (prayer.authorUserId) {
      return `익명 · ${prayer.authorLabel || '회원'}`
    }

    return '익명'
  }

  return prayer.authorLabel || '회원'
}

export function formatPrayerDate(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)

  return formatted.replaceAll('-', '.')
}

export function validatePrayerDraft(draft) {
  const category = draft?.category

  if (!PRAYER_CATEGORIES.some((item) => item.id === category)) {
    return '카테고리를 선택해 주세요.'
  }

  const title = String(draft?.title ?? '').trim()

  if (!title || title.length > PRAYER_TITLE_MAX) {
    return '기도 제목은 1자 이상 120자 이하로 입력해 주세요.'
  }

  const content = String(draft?.content ?? '').trim()

  if (!content || content.length > PRAYER_CONTENT_MAX) {
    return '기도 내용은 1자 이상 4000자 이하로 입력해 주세요.'
  }

  if (draft?.visibility !== 'public' && draft?.visibility !== 'private') {
    return '공개 범위를 선택해 주세요.'
  }

  if (draft?.status != null && draft.status !== 'praying' && draft.status !== 'answered') {
    return '기도 상태를 선택해 주세요.'
  }

  return null
}

export function prayerListStat(status, withParticipants) {
  if (status === 'praying' && withParticipants) {
    return 'together'
  }

  if (status === 'praying') {
    return 'praying'
  }

  if (status === 'answered') {
    return 'answered'
  }

  return 'all'
}

export function filtersForStat(stat) {
  if (stat === 'together') {
    return { status: 'praying', withParticipants: true }
  }

  if (stat === 'praying') {
    return { status: 'praying', withParticipants: false }
  }

  if (stat === 'answered') {
    return { status: 'answered', withParticipants: false }
  }

  return { status: 'all', withParticipants: false }
}

export const EMPTY_PRAYER_DRAFT = {
  category: '',
  title: '',
  content: '',
  isAnonymous: false,
  visibility: 'public',
  status: 'praying',
}
