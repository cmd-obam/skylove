import assert from 'node:assert/strict'
import test from 'node:test'
import {
  EVENT_MENU_ENABLED,
  EVENT_MENU_ITEM,
  THANKSGIVING_GAME_SUPER_ADMIN_ONLY,
} from '../src/data/eventMenu.js'
import { filterVisibleMenuItems } from '../src/data/menuVisibility.js'
import { PRAYER_MENU_ITEM } from '../src/data/prayerMenu.js'

const items = [
  { title: '새가족 안내', path: '/new-family', children: [{ title: '새가족 안내', path: '/new-family' }] },
  PRAYER_MENU_ITEM,
  ...(EVENT_MENU_ENABLED ? [EVENT_MENU_ITEM] : []),
]

function titlesFor(viewer) {
  return filterVisibleMenuItems(items, {
    ...viewer,
    superAdminGate: THANKSGIVING_GAME_SUPER_ADMIN_ONLY,
  }).map((item) => ({
    title: item.title,
    children: (item.children ?? []).map((child) => child.title),
  }))
}

test('이벤트 메뉴는 최고관리자만 보고, 기존 경로는 유지한다', () => {
  assert.equal(THANKSGIVING_GAME_SUPER_ADMIN_ONLY, true)
  assert.equal(EVENT_MENU_ITEM.requiresSuperAdmin, true)
  assert.equal(EVENT_MENU_ITEM.path, '/thanksgiving-game')
  assert.equal(EVENT_MENU_ENABLED, true)
})

test('중보기도 메뉴는 로그인 회원용이고 관리는 최고관리자용이다', () => {
  assert.equal(PRAYER_MENU_ITEM.requiresAuth, true)
  assert.equal(PRAYER_MENU_ITEM.path, '/prayer')
  assert.equal(PRAYER_MENU_ITEM.children.at(-1).requiresSuperAdmin, true)
})

test('비회원에게는 중보기도와 이벤트가 보이지 않는다', () => {
  assert.deepEqual(titlesFor({ isLoggedIn: false, isSuperAdmin: false }), [
    { title: '새가족 안내', children: ['새가족 안내'] },
  ])
})

test('일반 회원과 담임목사에게는 중보기도만 보이고 관리 메뉴는 없다', () => {
  assert.deepEqual(titlesFor({ isLoggedIn: true, isSuperAdmin: false }), [
    { title: '새가족 안내', children: ['새가족 안내'] },
    { title: '중보기도', children: ['기도 나눔', '기도 제목 작성'] },
  ])
})

test('최고관리자는 중보기도 관리와 이벤트를 모두 본다', () => {
  assert.deepEqual(titlesFor({ isLoggedIn: true, isSuperAdmin: true }), [
    { title: '새가족 안내', children: ['새가족 안내'] },
    { title: '중보기도', children: ['기도 나눔', '기도 제목 작성', '기도 관리'] },
    { title: '이벤트', children: ['미니게임'] },
  ])
})
