import { LOCATION_DATA } from '@/data/location'
import { WORSHIP_SCHEDULE } from '@/data/worship'
import welcomeImage from '@/assets/images/home/welcome-church-exterior.png'

export const HOME_HERO = {
  title: '하나님을 만나 사람이 행복한 교회',
  titleLines: ['하나님을 만나 사람이', '행복한 교회'],
  subtitle:
    '말씀 안에서 성장하고, 사랑으로 섬기며 다음 세대를 세워가는 하늘사랑교회입니다.',
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

export const HOME_NEWS_ITEMS = [
  {
    id: 'news-1',
    title: '교회 소식이 곧 업데이트됩니다',
    date: '준비 중',
    href: '/church-news',
    comingSoon: true,
  },
  {
    id: 'news-2',
    title: '행사 및 모임 안내',
    date: '준비 중',
    href: '/church-news',
    comingSoon: true,
  },
  {
    id: 'news-3',
    title: '새가족 환영 소식',
    date: '준비 중',
    href: '/new-family',
    comingSoon: true,
  },
  {
    id: 'news-4',
    title: '예배 안내',
    date: '준비 중',
    href: '/worship',
    comingSoon: true,
  },
  {
    id: 'news-5',
    title: '교회앨범',
    date: '준비 중',
    href: '/church-news/album',
    comingSoon: true,
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
