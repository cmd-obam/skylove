import { LOCATION_DATA } from '@/data/location'
import { WORSHIP_SCHEDULE } from '@/data/worship'
import welcomeImage from '@/assets/images/home/welcome-church-exterior.png'

export const HOME_HERO = {
  title: '하나님을 만나 사람이 행복한 교회',
  titleLines: ['하나님을 만나 사람이', '행복한 교회'],
  subtitle:
    '말씀 안에서 성장하고 사랑으로 섬기며 다음 세대를 세워가는 하늘사랑교회입니다.',
  subtitleLines: [
    '말씀 안에서 성장하고',
    '사랑으로 섬기며 다음 세대를 세워가는 하늘사랑교회입니다.',
  ],
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
  imageAlt: '하늘사랑교회 외관',
  links: [
    { label: '교회소개', href: '/about', icon: 'book' },
    { label: '담임목사 인사말', href: '/new-family', icon: 'user' },
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

export const HOME_STORY_CARDS = [
  {
    id: 'worship-story',
    title: '주일예배 이야기',
    description: '예배와 말씀, 찬양의 은혜로운 순간을 전합니다.',
    image: null,
    href: '/church-news',
    comingSoon: false,
  },
  {
    id: 'next-gen-story',
    title: '다음세대 이야기',
    description: '아이들과 청소년이 함께 성장하는 이야기입니다.',
    image: null,
    href: null,
    comingSoon: true,
  },
  {
    id: 'together-story',
    title: '함께하는 이야기',
    description: '교제와 섬김으로 이어지는 공동체의 이야기입니다.',
    image: null,
    href: null,
    comingSoon: true,
  },
]

/** 홈 최근 소식: 카테고리별 최신 게시글 1건씩 */
export const HOME_RECENT_NEWS_SOURCES = [
  {
    id: 'church_news',
    postType: 'church_news',
    categoryLabel: '교회소식',
    listPath: '/church-news',
    detailPath: (postId) => `/church-news/${postId}`,
  },
  {
    id: 'album',
    postType: 'album',
    categoryLabel: '교회앨범',
    listPath: '/church-news/album',
    detailPath: (postId) => `/church-news/album/${postId}`,
  },
  {
    id: 'sunday_sermon',
    postType: 'sunday_sermon',
    categoryLabel: '주일예배',
    listPath: '/worship-word/sunday',
    detailPath: (postId) => `/worship-word/sunday/${postId}`,
  },
  {
    id: 'el_shaddai_choir',
    postType: 'el_shaddai_choir',
    categoryLabel: '엘샤다이 찬양단',
    listPath: '/worship-word/el-shaddai',
    detailPath: (postId) => `/worship-word/el-shaddai/${postId}`,
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
