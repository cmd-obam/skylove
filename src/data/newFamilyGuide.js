import { WORSHIP_SCHEDULE } from '@/data/worship'
import { LOCATION_DATA } from '@/data/location'

export const NEW_FAMILY_HERO = {
  title: '새가족안내',
  subtitle: 'WELCOME',
  headlineLines: ['당신을 축복하며', '사랑으로 환영합니다.'],
  description: '처음 방문하셨다면 편안한 마음으로 예배드리시면 됩니다.',
  heroImage: null,
}

export const NEW_FAMILY_VIDEO = {
  titleLine1: '영상으로 만나는',
  titleLine2: '하늘사랑교회',
  descriptionLines: [
    '2009년 작은 가정에서 시작된',
    '하늘사랑교회의 이야기를',
    '영상으로 만나보세요.',
  ],
  videoUrl: null,
  thumbnail: null,
}

export const CHURCH_FEATURE_CARDS = [
  {
    id: 'word',
    title: '말씀의 교회',
    description: '하나님의 말씀을 중심으로 삶을 세워가는 공동체',
    icon: 'book',
  },
  {
    id: 'praise',
    title: '찬양의 교회',
    description: '하나님께 올려드리는 찬양으로 기쁨과 은혜가 넘치는 예배',
    icon: 'music',
  },
  {
    id: 'next-gen',
    title: '다음세대를 세우는 교회',
    description: '다음세대가 믿음 안에서 건강하게 성장하도록 함께합니다',
    icon: 'users',
  },
  {
    id: 'gospel',
    title: '복음의 감동을 전하는 교회',
    description: '예수 그리스도의 복음을 바르게 전하며 믿음의 본질을 지켜갑니다',
    icon: 'cross',
  },
]

export const WELCOME_REASON = {
  title: '하나님께서 예비하신 만남, 여러분을 환영합니다.',
  description: '누구든지 편안한 마음으로 함께 예배드릴 수 있습니다.',
  cards: [
    {
      id: 'first-time',
      title: '교회가 처음이신 분',
      description: '처음으로 예배를 드려보고 하나님을 알아가고 싶은 분',
      icon: 'door',
    },
    {
      id: 'new-church',
      title: '새로운 교회를 찾으시는 분',
      description: '함께 신앙생활할 교회를 찾고 계신 분',
      icon: 'compass',
    },
    {
      id: 'returning',
      title: '오랜만에 다시 교회를 찾으신 분',
      description: '다시 하나님께 나아오고 싶은 분',
      icon: 'path',
    },
    {
      id: 'moving',
      title: '이사 후 새로운 교회를 찾으시는 분',
      description: '새로운 지역에서 신앙공동체를 찾는 분',
      icon: 'home',
    },
    {
      id: 'restart',
      title: '신앙을 다시 시작하고 싶은 분',
      description: '믿음을 회복하며 새롭게 시작하고 싶은 분',
      icon: 'sprout',
    },
    {
      id: 'family',
      title: '가족과 함께 예배드리고 싶은 분',
      description: '온 가족이 함께 신앙생활하고 싶은 분',
      icon: 'family',
    },
  ],
}

export const FIRST_VISIT_STEPS = [
  {
    id: 'worship',
    title: '예배에 함께하세요',
    description: '교회는 누구에게나 열려 있습니다. 편안한 마음으로 예배에 참석해 보세요.',
    buttonLabel: '예배안내',
    buttonPath: '/worship-guide/sunday-blessing',
    icon: 'worship',
  },
  {
    id: 'greeting',
    title: '새가족 인사',
    description: '예배 후 새가족 안내 데스크에서 따뜻하게 맞이해 드립니다.',
    buttonLabel: '교회소개',
    buttonPath: '/about',
    icon: 'handshake',
  },
  {
    id: 'community',
    title: '공동체와 함께하세요',
    description: '셀모임과 다양한 공동체를 통해 함께 성장할 수 있습니다.',
    buttonLabel: '셀모임',
    buttonPath: '/worship-guide/cell-meeting',
    icon: 'community',
  },
]

export const CELL_MEETING = {
  title: '셀모임',
  eyebrow: '함께 나누고, 함께 기도하며, 함께 성장하는',
  description:
    '셀모임은 말씀을 나누고 서로를 위해 기도하며 삶을 함께하는 작은 공동체입니다. 처음 오신 분들도 편안하게 참여하실 수 있습니다.',
  buttonLabel: '셀모임 자세히 보기',
  buttonPath: '/worship-guide/cell-meeting',
  image: null,
}

export const FAQ_ITEMS = [
  {
    id: 'dress',
    question: '예배 복장은 어떻게 되나요?',
    answer:
      '특별한 복장 규정은 없습니다. 평소 입으시는 편안한 옷차림으로 오시면 됩니다. 하나님 앞에 마음을 준비하시는 것이 가장 중요합니다.',
  },
  {
    id: 'children',
    question: '아이와 함께 예배드릴 수 있나요?',
    answer:
      '네, 가능합니다. 유아·유치부와 유초등부 프로그램이 함께 운영되며, 가족과 함께 예배에 참석하실 수 있습니다.',
  },
  {
    id: 'parking',
    question: '주차는 가능한가요?',
    answer:
      '교회 내 주차장을 이용하실 수 있습니다. 주차가 어려우신 경우 안내 데스크에 문의해 주시면 도와드리겠습니다.',
  },
  {
    id: 'registration',
    question: '등록은 어떻게 하나요?',
    answer:
      '예배 후 새가족 안내 데스크에서 간단한 등록을 도와드립니다. 부담 없이 방문해 주시면 친절히 안내해 드리겠습니다.',
  },
  {
    id: 'offering',
    question: '헌금은 꼭 해야 하나요?',
    answer:
      '헌금은 강제가 아닙니다. 처음 방문하시는 분은 헌금 없이 예배에 참석하셔도 됩니다. 마음이 준비되었을 때 함께 나누어 주시면 됩니다.',
  },
]

export const CONTACT_INFO = {
  phone: LOCATION_DATA.phone,
  address: `${LOCATION_DATA.address} ${LOCATION_DATA.churchName}`,
  worshipSummary: WORSHIP_SCHEDULE.map((item) => `${item.name} ${item.time}`).join(' / '),
  mapImage: null,
  worshipGuidePath: '/worship-guide/sunday-blessing',
  locationPath: '/about/location',
}
