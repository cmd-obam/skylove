import worshipIcon from '@/assets/icons/worship.png'
import facilityIcon from '@/assets/icons/facility.png'
import noticeIcon from '@/assets/icons/notice.png'
import locationIcon from '@/assets/icons/location.png'

export const AUTH_LINKS = [
  { label: '로그인', path: '/login' },
  { label: '회원가입', path: '/signup' },
]

/** 햄버거 메뉴 · 회원메뉴(비로그인) 하위 */
export const MEMBER_MENU_GUEST_CHILDREN = [
  { title: '로그인', path: '/login' },
  { title: '아이디/비밀번호찾기', path: '/login?tab=find-id' },
  { title: '회원가입', path: '/signup' },
]

/** 햄버거 메뉴 · 회원메뉴(로그인) 하위 */
export const MEMBER_MENU_LOGGED_IN_CHILDREN = [
  { title: '내 정보', path: '/member/edit' },
  { title: '비밀번호 변경', path: '/mypage/change-password' },
]

export const MENU_ITEMS = [
  {
    title: '교회소개',
    path: '/about',
    children: [
      { title: '담임목사 인사', path: '/about' },
      {
        title: '섬기는 사람들',
        path: '/about/people',
        children: [
          { title: '직분자', path: '/about/people/clergy' },
          { title: '사역자', path: '/about/people/ministers' },
        ],
      },
      { title: '교회역사', path: '/about/history' },
      { title: '예배시간 안내', path: '/worship' },
      {
        title: '교회 둘러보기',
        path: '/about/facilities',
        children: [
          { title: '교회시설 안내', path: '/about/facilities' },
          { title: 'VR 둘러보기', path: '/about/facility-vr' },
        ],
      },
      { title: '찾아오시는 길', path: '/about/location' },
    ],
  },
  {
    title: '예배안내',
    path: '/worship-guide',
    children: [
      {
        title: '주일 축복 예배',
        path: '/worship-guide/sunday-blessing',
        children: [
          { title: '주일 축복 예배', path: '/worship-guide/sunday-blessing' },
          {
            title: '성찬식 예배',
            subtitle: '(매월 첫째 주)',
            path: '/worship-guide/sunday-blessing/communion',
          },
        ],
      },
      { title: '주일 찬양 예배', path: '/worship-guide/sunday-praise' },
      { title: '수요예배', path: '/worship-guide/wednesday' },
      { title: '새벽기도', path: '/worship-guide/dawn-prayer' },
      { title: '엘샤다이 찬양단', path: '/worship-guide/el-shaddai-choir' },
      { title: '셀모임', path: '/worship-guide/cell-meeting' },
    ],
  },
  {
    title: '예배말씀',
    path: '/worship-word',
    children: [
      { title: '주일예배', path: '/worship-word/sunday' },
      { title: '엘샤다이 찬양단', path: '/worship-word/el-shaddai' },
    ],
  },
  {
    title: '교회소식',
    path: '/church-news',
    children: [
      { title: '교회소식', path: '/church-news' },
      { title: '담임목사 이야기', path: '/church-news/pastor-story' },
      { title: '교회앨범', path: '/church-news/album' },
    ],
  },
  {
    title: '새가족 안내',
    path: '/new-family',
    children: [{ title: '새가족 안내', path: '/new-family' }],
  },
]

export function getFirstSubMenuPath(item) {
  const firstChild = item.children?.[0]

  if (!firstChild) {
    return item.path
  }

  return firstChild.path
}

export function menuItemContainsPath(item, pathname) {
  if (item.path === pathname) {
    return true
  }

  return item.children?.some((child) => menuItemContainsPath(child, pathname)) ?? false
}

export function findMenuSection(pathname) {
  for (const item of MENU_ITEMS) {
    if (item.children?.some((child) => menuItemContainsPath(child, pathname))) {
      return item
    }
  }

  for (const item of MENU_ITEMS) {
    if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
      return item
    }
  }

  return null
}

function pathMatchesMenu(menuPath, pathname) {
  return pathname === menuPath || pathname.startsWith(`${menuPath}/`)
}

/**
 * Prefer the deepest matching menu item so parent groups that share a path
 * with a nested leaf (e.g. 교회 둘러보기 / 교회시설 안내) resolve to the leaf.
 */
export function findMenuItemInSection(section, pathname) {
  let best = null

  for (const child of section?.children ?? []) {
    const nestedMatches =
      child.children?.filter((subItem) => pathMatchesMenu(subItem.path, pathname)) ?? []

    if (nestedMatches.length > 0) {
      const nestedChild = nestedMatches.reduce((deepest, item) =>
        item.path.length >= deepest.path.length ? item : deepest,
      )
      const candidate = { item: nestedChild, parent: child }
      if (
        !best ||
        candidate.item.path.length > best.item.path.length ||
        (candidate.item.path.length === best.item.path.length && candidate.parent)
      ) {
        best = candidate
      }
      continue
    }

    if (pathMatchesMenu(child.path, pathname)) {
      const candidate = { item: child, parent: null }
      if (!best || candidate.item.path.length > best.item.path.length) {
        best = candidate
      }
    }
  }

  return best
}

export const QUICK_MENUS = [
  {
    title: '예배시간 안내',
    desc: '예배 시간과 순서를 안내합니다',
    icon: worshipIcon,
    href: '/worship',
  },
  {
    title: '시설안내',
    desc: '교회 시설을 둘러보세요',
    icon: facilityIcon,
    href: '/about/facilities',
  },
  {
    title: '공지사항',
    desc: '교회 소식과 공지를 확인하세요',
    icon: noticeIcon,
    href: '/church-news',
  },
  {
    title: '찾아오시는 길',
    desc: '교회 위치와 교통 안내',
    icon: locationIcon,
    href: '/about/location',
  },
]
