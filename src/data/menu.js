import worshipIcon from '@/assets/icons/worship.png'
import facilityIcon from '@/assets/icons/facility.png'
import noticeIcon from '@/assets/icons/notice.png'
import locationIcon from '@/assets/icons/location.png'

export const AUTH_LINKS = [
  { label: '로그인', path: '/login' },
  { label: '회원가입', path: '/signup' },
]

export const MENU_ITEMS = [
  {
    title: '교회소개',
    path: '/about',
    children: [
      { title: '담임목사 인사', path: '/about' },
      { title: '교회역사', path: '/about/history' },
      { title: '예배시간 안내', path: '/worship' },
      {
        title: '교회 둘러보기',
        path: '/about/facilities',
        children: [
          { title: '시설안내', path: '/about/facilities' },
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
          { title: '주일 예배', path: '/worship-guide/sunday-blessing' },
          { title: '성찬식', path: '/worship-guide/sunday-blessing/communion' },
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
    title: '교회소식',
    path: '/church-news',
    children: [
      { title: '교회소식', path: '/church-news' },
      { title: '교회앨범', path: '/church-news/album' },
    ],
  },
  {
    title: '새가족 안내',
    path: '/new-family',
    children: [{ title: '새가족 안내', path: '/new-family' }],
  },
]

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

export function findMenuItemInSection(section, pathname) {
  for (const child of section?.children ?? []) {
    if (child.path === pathname) {
      return { item: child, parent: null }
    }

    const nestedChild = child.children?.find((subItem) => subItem.path === pathname)
    if (nestedChild) {
      return { item: nestedChild, parent: child }
    }
  }

  return null
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
