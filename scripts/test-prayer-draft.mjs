import assert from 'node:assert/strict'
import test from 'node:test'
import {
  filtersForStat,
  formatPrayerDate,
  prayerAuthorLabel,
  prayerListStat,
  validatePrayerDraft,
} from '../src/services/prayer/present.js'

const validDraft = {
  category: 'personal',
  title: '가정의 평안',
  content: '가족 모두가 건강하도록 기도합니다.',
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

test('작성일은 한국 시간 기준으로 표시한다', () => {
  assert.equal(formatPrayerDate('2026-11-21T15:30:00.000Z'), '2026.11.22')
  assert.equal(formatPrayerDate('2026-11-21T02:00:00.000Z'), '2026.11.21')
  assert.equal(formatPrayerDate(''), '')
})

test('익명 작성자는 최고관리자에게만 실명이 붙는다', () => {
  assert.equal(prayerAuthorLabel({ isAnonymous: true, authorLabel: '김성도', authorUserId: null }), '익명')
  assert.equal(
    prayerAuthorLabel({ isAnonymous: true, authorLabel: '김성도', authorUserId: 'user-1' }),
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
