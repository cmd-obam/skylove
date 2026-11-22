export const PRAYER_PATH = '/prayer'
export const PRAYER_WRITE_PATH = '/prayer/write'
export const PRAYER_MANAGE_PATH = '/prayer/manage'

export function prayerDetailPath(prayerId) {
  return `/prayer/${prayerId}`
}

export function prayerEditPath(prayerId) {
  return `/prayer/${prayerId}/edit`
}

/** 중보기도는 로그인한 회원에게만 보인다. 목록 관리는 게시글 관리의 중보기도 탭. */
export const PRAYER_MENU_ITEM = {
  title: '중보기도',
  path: PRAYER_PATH,
  requiresAuth: true,
  children: [
    { title: '중보기도', path: PRAYER_PATH },
    { title: '기도 제목 작성', path: PRAYER_WRITE_PATH },
  ],
}
