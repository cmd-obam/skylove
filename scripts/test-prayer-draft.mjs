import assert from 'node:assert/strict'
import test from 'node:test'
import {
  filtersForStat,
  formatPrayerDate,
  prayerAuthorLabel,
  prayerCardTitle,
  prayerListStat,
  prayerMatchesCard,
  validatePrayerDraft,
} from '../src/services/prayer/present.js'

const validDraft = {
  category: 'personal',
  title: '가정의 평안',
  content: '가족 모두가 건강하도록 기도합니다.',
  writerName: '김성도',
  visibility: 'public',
  status: 'praying',
}

test('기도 제목 초안은 카테고리와 길이, 공개 범위를 검사한다', () => {
  assert.equal(validatePrayerDraft(validDraft), null)
  assert.equal(validatePrayerDraft({ ...validDraft, category: 'intercession' }), null)
  assert.equal(validatePrayerDraft({ ...validDraft, category: '' }), '기도카드분류를 선택해 주세요.')
  assert.equal(validatePrayerDraft({ ...validDraft, category: 'family' }), null)
  assert.equal(validatePrayerDraft({ ...validDraft, category: 'spirit' }), null)
  assert.equal(validatePrayerDraft({ ...validDraft, category: 'unknown' }), '기도카드분류를 선택해 주세요.')
  assert.equal(validatePrayerDraft({ ...validDraft, title: '   ' }), '기도 제목은 1자 이상 120자 이하로 입력해 주세요.')
  assert.equal(
    validatePrayerDraft({ ...validDraft, title: '가'.repeat(121) }),
    '기도 제목은 1자 이상 120자 이하로 입력해 주세요.',
  )
  assert.equal(validatePrayerDraft({ ...validDraft, content: '' }), '기도 내용은 1자 이상 4000자 이하로 입력해 주세요.')
  assert.equal(validatePrayerDraft({ ...validDraft, visibility: 'hidden' }), '공개 범위를 선택해 주세요.')
})

test('기도카드 제목은 체크한 순서를 따른다', () => {
  assert.equal(prayerCardTitle(['spirit']), '영적을 위한 기도')
  assert.equal(prayerCardTitle(['health']), '건강을 위한 기도')
  assert.equal(prayerCardTitle(['identity']), '경제를 위한 기도')
  assert.equal(prayerCardTitle(['path']), '진로를 위한 기도')
  assert.equal(prayerCardTitle(['family']), '가정을 위한 기도')
  assert.equal(prayerCardTitle(['other']), '기타 기도 제목')
  assert.equal(prayerCardTitle(['other'], '새 직장'), '새 직장')
  assert.equal(prayerCardTitle(['spirit', 'health']), '영적 · 건강을 위한 기도')
  assert.equal(prayerCardTitle(['health', 'spirit']), '건강 · 영적을 위한 기도')
  assert.equal(prayerCardTitle(['spirit', 'other'], '직장'), '영적 · 직장을 위한 기도')
  assert.equal(
    validatePrayerDraft({ ...validDraft, cardIds: [], category: '' }),
    '기도카드분류를 선택해 주세요.',
  )
  assert.equal(validatePrayerDraft({ ...validDraft, cardIds: ['other'], otherText: '  ' }), null)
  assert.equal(validatePrayerDraft({ ...validDraft, cardIds: ['other'], otherText: '새 직장' }), null)
  assert.equal(
    validatePrayerDraft({ ...validDraft, cardIds: ['spirit'], writerName: '  ', isAnonymous: false }),
    '이름을 입력해 주세요.',
  )
})

test('작성일은 한국 시간 기준으로 표시한다', () => {
  assert.equal(formatPrayerDate('2026-11-21T15:30:00.000Z'), '2026.11.22')
  assert.equal(formatPrayerDate('2026-11-21T02:00:00.000Z'), '2026.11.21')
  assert.equal(formatPrayerDate(''), '')
})

test('익명 작성자는 기도 화면에는 익명만 보이고 관리 화면에서만 실명이 붙는다', () => {
  assert.equal(prayerAuthorLabel({ isAnonymous: true, authorLabel: '김성도', authorUserId: null }), '익명')
  assert.equal(
    prayerAuthorLabel({ isAnonymous: true, authorLabel: '김성도', authorUserId: 'user-1' }),
    '익명',
  )
  assert.equal(
    prayerAuthorLabel({ isAnonymous: true, authorLabel: '김성도', authorUserId: 'user-1' }, { reveal: true }),
    '익명 · 김성도',
  )
  assert.equal(prayerAuthorLabel({ isAnonymous: false, authorLabel: '김성도', authorUserId: null }), '김성도')
})

test('통계 카드는 중보기도와 개인기도 목록으로 나뉜다', () => {
  assert.equal(prayerListStat('praying', false, 'intercession'), 'together')
  assert.equal(prayerListStat('praying', false, 'personal'), 'praying')
  assert.equal(prayerListStat('answered', false, ''), 'answered')
  assert.deepEqual(filtersForStat('together'), {
    status: 'praying',
    category: 'intercession',
    withParticipants: false,
  })
  assert.deepEqual(filtersForStat('praying'), {
    status: 'praying',
    category: 'personal',
    withParticipants: false,
  })
  assert.deepEqual(filtersForStat('answered'), {
    status: 'answered',
    category: '',
    withParticipants: false,
  })
})

test('중보기도 분류 필터는 제목의 기도카드를 가린다', () => {
  const spirit = { category: 'intercession', title: '영적을 위한 기도' }
  const both = { category: 'intercession', title: '건강 · 진로를 위한 기도' }
  const other = { category: 'intercession', title: '기타 기도 제목' }

  assert.equal(prayerMatchesCard(spirit, ''), true)
  assert.equal(prayerMatchesCard(spirit, 'spirit'), true)
  assert.equal(prayerMatchesCard(spirit, 'health'), false)
  assert.equal(prayerMatchesCard(both, 'health'), true)
  assert.equal(prayerMatchesCard(both, 'path'), true)
  assert.equal(prayerMatchesCard(other, 'other'), true)
  assert.equal(prayerMatchesCard({ category: 'spirit', title: '자유 제목' }, 'spirit'), true)
})
