export const PRAYER_PATH = '/prayer'
export const PRAYER_WRITE_PATH = '/prayer/write'
export const PRAYER_MANAGE_PATH = '/prayer/manage'

export function prayerDetailPath(prayerId) {
  return `/prayer/${prayerId}`
}

export function prayerEditPath(prayerId) {
  return `/prayer/${prayerId}/edit`
}

/** 중보기도는 로그인한 회원에게만 보인다. 관리 화면은 최고관리자만. */
export const PRAYER_MENU_ITEM = {
  title: '중보기도',
  path: PRAYER_PATH,
  requiresAuth: true,
  children: [
    { title: '기도 나눔', path: PRAYER_PATH },
    { title: '기도 제목 작성', path: PRAYER_WRITE_PATH },
    { title: '기도 관리', path: PRAYER_MANAGE_PATH, requiresSuperAdmin: true },
  ],
}
