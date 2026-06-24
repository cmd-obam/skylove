import worshipIcon from '@/assets/icons/worship.png'
import facilityIcon from '@/assets/icons/facility.png'
import noticeIcon from '@/assets/icons/notice.png'
import locationIcon from '@/assets/icons/location.png'

export const AUTH_LINKS = [
  { label: '로그인', href: '#login' },
  { label: '회원가입', href: '#signup' },
]

export const UTILITY_LINKS = [
  { label: '홈으로', href: '/' },
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
      { title: '담임목사', path: '/about/pastor' },
      { title: '섬기는 사람들', path: '/about/servants' },
      { title: '예배안내', path: '/worship' },
      { title: '오시는 길', path: '/about/location' },
    ],
  },
  {
    title: '말씀&찬양',
    path: '/word-worship',
  },
  {
    title: '교육&양육',
    path: '/education',
  },
  {
    title: '전도&선교',
    path: '/mission',
  },
  {
    title: '나눔&교제',
    path: '/fellowship',
  },
  {
    title: '교회학교',
    path: '/sunday-school',
  },
  {
    title: '젊은이부',
    path: '/youth',
  },
]

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
    href: '/facilities',
  },
  {
    title: '공지사항',
    desc: '교회 소식과 공지를 확인하세요',
    icon: noticeIcon,
    href: '/notice',
  },
  {
    title: '오시는 길',
    desc: '교회 위치와 교통 안내',
    icon: locationIcon,
    href: '/about/location',
  },
]
