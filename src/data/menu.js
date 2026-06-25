import worshipIcon from '@/assets/icons/worship.png'
import facilityIcon from '@/assets/icons/facility.png'
import noticeIcon from '@/assets/icons/notice.png'
import locationIcon from '@/assets/icons/location.png'

export const AUTH_LINKS = [
  { label: '로그인', href: '#login' },
  { label: '회원가입', href: '#signup' },
]

export const MENU_ITEMS = [
  {
    title: '교회소개',
    path: '/about',
    children: [
      { title: '교회소개', path: '/about' },
      { title: '교회역사', path: '/about/history' },
      { title: '예배안내', path: '/worship' },
      { title: '시설둘러보기(VR)', path: '/about/facility-vr' },
      { title: '찾아오시는 길', path: '/about/location' },
    ],
  },
  {
    title: '말씀&찬양',
    path: '/word-worship',
    children: [
      { title: '말씀&찬양', path: '/word-worship' },
    ],
  },
  {
    title: '교회학교',
    path: '/sunday-school',
    children: [
      { title: '교회학교', path: '/sunday-school' },
    ],
  },
  {
    title: '교회생활',
    path: '/church-life',
    children: [
      { title: '교회앨범', path: '/church-life/album' },
      { title: '전도 및 섬김', path: '/church-life/service' },
      { title: '예배와 찬양', path: '/church-life/worship-praise' },
    ],
  },
]

export function findMenuSection(pathname) {
  for (const item of MENU_ITEMS) {
    if (item.children?.some((child) => child.path === pathname)) {
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

export const QUICK_MENUS = [
  {
    title: '예배안내',
    desc: '예배 시간과 순서를 안내합니다',
    icon: worshipIcon,
    href: '/worship',
  },
  {
    title: '시설안내',
    desc: '교회 시설을 둘러보세요',
    icon: facilityIcon,
    href: '/about/facility-vr',
  },
  {
    title: '공지사항',
    desc: '교회 소식과 공지를 확인하세요',
    icon: noticeIcon,
    href: '/notice',
  },
  {
    title: '찾아오시는 길',
    desc: '교회 위치와 교통 안내',
    icon: locationIcon,
    href: '/about/location',
  },
]
