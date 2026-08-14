import { LOCATION_DATA } from '@/data/location'
import { WORSHIP_SCHEDULE } from '@/data/worship'
import welcomeImage from '@/assets/images/home/welcome-church-exterior.png'
import welcomeImageMobile from '@/assets/images/home/welcome-church-exterior-mobile.png'

export const HOME_HERO = {
  title: '하나님을 만나 사람이 행복한 교회',
  titleLines: ['하나님을 만나 사람이', '행복한 교회'],
  subtitle:
    '말씀 안에서 성장하고 사랑으로 섬기며 다음 세대를 세워가는 하늘사랑교회입니다.',
  subtitleLines: [
    '말씀 안에서 성장하고',
    '사랑으로 섬기며 다음 세대를 세워가는 하늘사랑교회입니다.',
  ],
  /* Mobile-only line breaks (PC keeps subtitleLines). */
  subtitleLinesMobile: [
    '말씀 안에서 성장하고',
    '사랑으로 섬기며,',
    '다음 세대를 세워가는',
    '하늘사랑교회입니다.',
  ],
  subtitleMobileSpacedAfter: [0, 2],
  primaryCta: { label: '처음오신분을 환영합니다', href: '/new-family' },
  secondaryCta: { label: '예배 안내 보기', href: '/worship' },
}

export const HOME_WELCOME = {
  eyebrow: 'WELCOME',
  title: '하늘사랑교회에 오신 것을 환영합니다',
  titleLines: ['하늘사랑교회에', '오신 것을 환영합니다'],
  descriptionLines: [
    '처음 오신 한 분도 가족처럼 환영합니다.',
    '예배를 통해 하나님을 만나고,',
    '서로 사랑하며 함께 성장하는',
    '따뜻한 공동체입니다.',
  ],
  image: welcomeImage,
  imageMobile: welcomeImageMobile,
  imageAlt: '하늘사랑교회 외관',
  links: [
    { label: '교회소개', href: '/about', icon: 'book' },
    {
      label: '담임목사 인사말',
      href: 'https://youtu.be/Uhl1Wb4WkEI?si=75zlkXpHm_Iu0_pU',
      icon: 'user',
      external: true,
    },
  ],
}

const WORSHIP_DESCRIPTIONS = {
  'sunday-blessing': '말씀과 축복 가운데 하나님을 만나는 주일 예배입니다.',
  'sunday-praise': '찬양과 감사로 주님을 높이는 주일 예배입니다.',
  wednesday: '한 주의 중심에서 말씀과 기도로 은혜를 나누는 예배입니다.',
  'dawn-prayer': '새벽의 고요한 시간, 함께 기도하며 하루를 시작합니다.',
}

export const HOME_WORSHIP_ITEMS = WORSHIP_SCHEDULE.slice(0, 4).map((item) => ({
  ...item,
  description: WORSHIP_DESCRIPTIONS[item.id] ?? '예배 안내가 준비 중입니다.',
  href: `/worship-guide/${item.id === 'sunday-cell' ? 'cell-meeting' : item.id}`,
  icon:
    item.id === 'sunday-blessing'
      ? 'cross'
      : item.id === 'sunday-praise'
        ? 'book'
        : item.id === 'wednesday'
          ? 'sun'
          : 'people',
}))

/** 홈 교회 이야기 섹션 헤더 */
export const HOME_STORY = {
  eyebrow: 'OUR STORY',
  title: '교회 이야기',
  subtitle: '하늘사랑감리교회의 다양한 소식과 이야기를 전합니다.',
}

/**
 * 홈 교회 이야기 카드 (왼쪽부터)
 * 1. 예배말씀 최신 / 2. 엘샤다이 찬양단 최신 / 3. 교회소식 최신 / 4. 교회앨범 최신 / 5. 담임목사 이야기 최신
 */
export const HOME_STORY_SOURCES = [
  {
    id: 'sunday_sermon',
    postType: 'sunday_sermon',
    badgeLabel: '주일예배 이야기',
    dateSuffix: '주일예배',
    featured: true,
    listPath: '/worship-word/sunday',
    detailPath: (postId) => `/worship-word/sunday/${postId}`,
  },
  {
    id: 'el_shaddai_choir',
    postType: 'el_shaddai_choir',
    badgeLabel: '엘샤다이 찬양단',
    featured: false,
    listPath: '/worship-word/el-shaddai',
    detailPath: (postId) => `/worship-word/el-shaddai/${postId}`,
  },
  {
    id: 'church_news',
    postType: 'church_news',
    badgeLabel: '교회소식',
    featured: false,
    listPath: '/church-news',
    detailPath: (postId) => `/church-news/${postId}`,
  },
  {
    id: 'album',
    postType: 'album',
    badgeLabel: '교회앨범',
    featured: false,
    listPath: '/church-news/album',
    detailPath: (postId) => `/church-news/album/${postId}`,
  },
  {
    id: 'pastor_story',
    postType: 'pastor_story',
    badgeLabel: '담임목사 이야기',
    featured: false,
    listPath: '/church-news/pastor-story',
    detailPath: (postId) => `/church-news/pastor-story/${postId}`,
  },
]

export const HOME_LOCATION = {
  eyebrow: 'LOCATION',
  title: '찾아오시는 길',
  address: LOCATION_DATA.address,
  phone: LOCATION_DATA.phone,
  churchName: LOCATION_DATA.churchName,
  cta: { label: '자세히 보기', href: '/about/location' },
}
