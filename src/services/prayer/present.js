export const PRAYER_TITLE_MAX = 120
export const PRAYER_CONTENT_MAX = 4000

export const PRAYER_CATEGORIES = [
  { id: 'intercession', label: '중보기도' },
  { id: 'personal', label: '개인기도' },
]

export const PRAYER_CARD_CATEGORIES = [
  { id: 'spirit', label: '영적' },
  { id: 'health', label: '건강' },
  { id: 'identity', label: '경제' },
  { id: 'path', label: '진로' },
  { id: 'family', label: '가정' },
  { id: 'other', label: '기타' },
]

const LEGACY_CATEGORY_LABELS = {
  family: '가정',
  health: '건강',
  church: '교회',
  mission: '선교',
  other: '기타',
}

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

const CATEGORY_LABELS = Object.fromEntries(
  [...PRAYER_CATEGORIES, ...PRAYER_CARD_CATEGORIES].map((item) => [item.id, item.label]),
)

export function prayerCategoryLabel(category) {
  return CATEGORY_LABELS[category] ?? LEGACY_CATEGORY_LABELS[category] ?? '기타'
}

function objectParticle(word) {
  const last = String(word ?? '').charCodeAt(String(word ?? '').length - 1)

  if (!last || last < 0xac00 || last > 0xd7a3) {
    return '를'
  }

  return (last - 0xac00) % 28 === 0 ? '를' : '을'
}

export function prayerCardTitle(cardIds, otherText) {
  if ((cardIds || []).length === 1 && cardIds[0] === 'other') {
    return String(otherText ?? '').trim() || '기타 기도 제목'
  }

  const labels = (cardIds || [])
    .map((id) => (id === 'other' ? String(otherText ?? '').trim() || '기타' : prayerCategoryLabel(id)))
    .filter(Boolean)

  if (labels.length === 0) {
    return ''
  }

  if (labels.length === 1) {
    if (labels[0] === '기타') {
      return '기타 기도 제목'
    }

    return `${labels[0]}${objectParticle(labels[0])} 위한 기도`
  }

  const last = labels[labels.length - 1]

  return `${labels.slice(0, -1).join(' · ')} · ${last}${objectParticle(last)} 위한 기도`
}

export function parsePrayerCardSelection(title, _category) {
  const text = String(title ?? '').trim()

  if (_category === 'other') {
    return {
      cardIds: ['other'],
      otherText: text === '기타 기도 제목' ? '' : text,
    }
  }

  const known = new Map(
    PRAYER_CARD_CATEGORIES.filter((item) => item.id !== 'other').map((item) => [item.label, item.id]),
  )
  known.set('정체', 'identity')
  known.set('정치', 'identity')
  let parts = []

  if (text === '기타 기도 제목') {
    return { cardIds: ['other'], otherText: '' }
  }

  if (/(?:을|를) 위한 기도$/.test(text)) {
    parts = text
      .replace(/(?:을|를) 위한 기도$/, '')
      .split(' · ')
      .map((part) => part.trim())
      .filter(Boolean)
  } else if (text.endsWith('기도') && !text.includes(' · ')) {
    parts = [text.slice(0, -'기도'.length).trim()].filter(Boolean)
  }

  const cardIds = []
  let otherText = ''

  parts.forEach((part) => {
    const id = known.get(part)

    if (id) {
      cardIds.push(id)
      return
    }

    if (!cardIds.includes('other')) {
      cardIds.push('other')
    }

    otherText = part
  })

  return { cardIds, otherText }
}

export function prayerStatusLabel(status) {
  return status === 'answered' ? '응답 완료' : '기도 중'
}

export function prayerVisibilityLabel(visibility) {
  return visibility === 'private' ? '비공개' : '회원 공개'
}

export function prayerAuthorLabel(prayer, options = {}) {
  if (!prayer) {
    return '회원'
  }

  if (prayer.isAnonymous) {
    const realName = prayer.authorLabel && prayer.authorLabel !== '익명' ? prayer.authorLabel : ''

    if (options.reveal && prayer.authorUserId && realName) {
      return `익명 · ${realName}`
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

export function applyPrayerCardTitle(draft) {
  const cardIds = Array.isArray(draft?.cardIds) ? draft.cardIds : null

  if (!cardIds || cardIds.length === 0) {
    return draft
  }

  const usesCard = cardIds.some((id) => PRAYER_CARD_CATEGORIES.some((item) => item.id === id))

  return {
    ...draft,
    category: cardIds[0],
    title: usesCard ? prayerCardTitle(cardIds, draft.otherText) : draft.title,
  }
}

export function validatePrayerDraft(draft) {
  const cardIds = Array.isArray(draft?.cardIds) ? draft.cardIds : null

  if (cardIds) {
    if (cardIds.length === 0) {
      return '기도카드분류를 선택해 주세요.'
    }

    if (cardIds.length === 1 && cardIds[0] === 'other' && !String(draft?.otherText ?? '').trim()) {
      return '기도 제목을 작성해 주세요.'
    }
  }

  if (!draft?.isAnonymous && !String(draft?.writerName ?? '').trim()) {
    return '이름을 입력해 주세요.'
  }

  const next = applyPrayerCardTitle(draft)
  const category = next?.category

  const allowedCategories = new Set([
    ...PRAYER_CATEGORIES.map((item) => item.id),
    ...PRAYER_CARD_CATEGORIES.map((item) => item.id),
    'church',
    'mission',
  ])

  if (!allowedCategories.has(category)) {
    return '기도카드분류를 선택해 주세요.'
  }

  const title = String(next?.title ?? '').trim()

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

export function prayerListStat(status, _withParticipants, category) {
  if (status === 'answered') {
    return 'answered'
  }

  if (category === 'intercession') {
    return 'together'
  }

  if (status === 'praying') {
    return 'praying'
  }

  return 'all'
}

export function filtersForStat(stat) {
  if (stat === 'together') {
    return { status: 'praying', category: 'intercession', withParticipants: false }
  }

  if (stat === 'praying') {
    return { status: 'praying', category: 'personal', withParticipants: false }
  }

  if (stat === 'answered') {
    return { status: 'answered', category: '', withParticipants: false }
  }

  return { status: 'praying', category: 'personal', withParticipants: false }
}

export const EMPTY_PRAYER_DRAFT = {
  category: '',
  cardIds: [],
  otherText: '',
  writerName: '',
  title: '',
  content: '',
  isAnonymous: false,
  visibility: 'public',
  status: 'praying',
}
