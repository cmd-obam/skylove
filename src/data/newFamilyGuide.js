import { WORSHIP_SCHEDULE } from '@/data/worship'
import { LOCATION_DATA } from '@/data/location'
import welcomeReasonIcon01 from '@/assets/images/newFamily/welcome-reason-icon-01.png'
import welcomeReasonIcon02 from '@/assets/images/newFamily/welcome-reason-icon-02.png'
import welcomeReasonIcon03 from '@/assets/images/newFamily/welcome-reason-icon-03.png'
import welcomeReasonIcon04 from '@/assets/images/newFamily/welcome-reason-icon-04.png'
import welcomeReasonIcon05 from '@/assets/images/newFamily/welcome-reason-icon-05.png'
import welcomeReasonIcon06 from '@/assets/images/newFamily/welcome-reason-icon-06.png'

export const NEW_FAMILY_HERO = {
  title: '새가족안내',
  subtitle: 'WELCOME',
  welcomeLine: '여러분들을 환영합니다',
  headlineLine1: '당신을 축복하고',
  headlineHighlight: '사랑으로',
  headlineLine2Prefix: '환영합니',
  headlineLine2Suffix: '다.',
  descriptionLines: [
    '하나님의 은혜가 가득한 이곳에서',
    '행복한 믿음의 여정을 함께 시작해요.',
  ],
  heroImage: null,
}

export const NEW_FAMILY_VIDEO = {
  introImage: null,
  videoTitle: "사람이 행복한 '천안하늘사랑감리교회'",
  videoUrl: 'https://www.youtube.com/embed/Uhl1Wb4WkEI',
  videoId: 'Uhl1Wb4WkEI',
  playButtonLabel: '인사말 영상 보기',
  pastorName: '최석림 목사',
  pastorRole: '하늘사랑교회 담임목사',
  thumbnail: null,
}

export function getYouTubeThumbnail(videoId, quality = 'maxresdefault') {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`
}

export const CHURCH_FEATURE_CARDS = [
  {
    id: 'word',
    title: '말씀이 살아있는 교회',
    description: '하나님의 말씀을 중심으로 삶을 세워가는 공동체',
    icon: 'book',
    theme: 'blue',
  },
  {
    id: 'praise',
    title: '찬양이 넘치는 교회',
    description: '하나님께 올려드리는 찬양으로 기쁨과 은혜가 넘치는 예배',
    icon: 'music',
    theme: 'green',
  },
  {
    id: 'next-gen',
    title: '다음세대를 세우는 교회',
    description: '다음세대가 믿음 안에서 건강하게 성장하도록 함께합니다',
    icon: 'users',
    theme: 'orange',
  },
  {
    id: 'gospel',
    title: '복음의 정통을 지켜가는 교회',
    description: '예수 그리스도의 복음을 바르게 전하여 믿음의 본질을 지켜갑니다',
    icon: 'cross',
    theme: 'purple',
  },
]

export const WELCOME_REASON = {
  eyebrow: '하늘사랑교회를 처음 방문하신 모든 분들을 환영합니다.',
  title: null,
  description: '누구든 편안한 마음으로 함께 예배하실 수 있습니다.',
  items: [
    {
      id: 'first-time',
      titleLines: ['교회가', '처음이신분'],
      descriptionLines: ['처음으로 예배를 드려보고', '하나님을 알아가고 싶은 분'],
      icon: welcomeReasonIcon01,
    },
    {
      id: 'new-church',
      titleLines: ['새로운 교회를', '찾고 계신 분'],
      descriptionLines: ['함께 신앙생활 할', '교회를 찾고 계신 분'],
      icon: welcomeReasonIcon02,
    },
    {
      id: 'returning',
      titleLines: ['오랜만에', '다시 교회를', '찾으신 분'],
      descriptionLines: ['다시 하나님께', '나아오고 싶은 분'],
      icon: welcomeReasonIcon03,
    },
    {
      id: 'after-move',
      titleLines: ['이사 후 새로운', '교회를 찾으시는 분'],
      descriptionLines: ['새로운 지역에서', '신앙공동체를 찾는 분'],
      icon: welcomeReasonIcon04,
    },
    {
      id: 'restart-faith',
      titleLines: ['신앙을', '다시 시작하고', '싶은 분'],
      descriptionLines: ['믿음을 회복하여', '새롭게 시작하고 싶은 분'],
      icon: welcomeReasonIcon05,
    },
    {
      id: 'family-worship',
      titleLines: ['가족과 함께', '예배드리고', '싶은 분'],
      descriptionLines: ['온 가족이 함께', '신앙생활하고 싶은 분'],
      icon: welcomeReasonIcon06,
    },
  ],
}

export const FIRST_VISIT_STEPS = [
  {
    id: 'worship',
    title: '예배에 함께하세요',
    descriptionLines: [
      '교회는 누구에게나 열려 있습니다.',
      '편안한 마음으로 예배에 참여해 보세요.',
    ],
    buttonLabel: '예배안내 보기',
    buttonPath: '/worship',
  },
  {
    id: 'greeting',
    title: '새가족 인사',
    descriptionLines: [
      '예배 후 새가족 데스크에서',
      '따뜻하게 맞이해 드립니다.',
    ],
    buttonLabel: '교회소개 보기',
    buttonPath: '/about',
  },
  {
    id: 'community',
    title: '공동체와 함께하세요',
    descriptionLines: [
      '셀모임과 다양한 공동체를 통해',
      '함께 성장할 수 있습니다.',
    ],
    buttonLabel: '셀모임 보기',
    buttonPath: '/worship-guide/cell-meeting',
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
    id: 'first-visit',
    question: '교회에 처음 가는데, 그냥 들어가도 되나요?',
    answer:
      '네, 물론입니다.\n\n따로 신청하거나 연락하지 않으셔도 예배 시간에 맞춰 편하게 오시면 됩니다. 교회에 도착하시면 2층으로 올라와 본당으로 들어오시면 됩니다.',
  },
  {
    id: 'late',
    question: '예배 시간보다 조금 늦어도 괜찮나요?',
    answer:
      '네, 괜찮습니다.\n\n늦었다고 부담 갖지 마시고 조용히 들어오시면 됩니다. 처음 방문하시는 분들은 예배 시작 10분 전쯤 오시면 조금 더 여유롭게 안내받으실 수 있습니다.',
  },
  {
    id: 'worship-order',
    question: '예배가 처음이라 순서를 몰라도 괜찮나요?',
    answer:
      '네, 괜찮습니다.\n\n예배에 필요한 성경책은 예배당 뒤편에 준비되어 있습니다. 또한 찬양 가사와 성경 구절, 예배 순서 등 예배 전반의 내용은 앞 화면 PPT로 안내되니 처음 오신 분도 편하게 함께하실 수 있습니다.',
  },
  {
    id: 'children',
    question: '아이와 함께 예배드릴 수 있나요?',
    answer:
      '네, 가능합니다.\n\n예배당 뒤편에 자모실이 마련되어 있어 아이와 함께 오신 분들도 편안하게 예배드리실 수 있습니다.',
  },
  {
    id: 'parking',
    question: '주차는 가능한가요?',
    answer: '네, 가능합니다.\n\n교회 주변 주차 공간을 이용하실 수 있습니다.',
  },
  {
    id: 'offering',
    question: '헌금은 꼭 해야 하나요?',
    answer:
      '처음 방문하신 분들은 헌금에 부담 갖지 않으셔도 됩니다.\n\n헌금은 하나님께 감사하는 마음으로 자원하여 드리는 예배의 한 부분입니다. 감사의 마음으로 드리고 싶으신 경우 자유롭게 헌금하실 수 있습니다.',
  },
  {
    id: 'introduction',
    question: '처음 왔다고 사람들 앞에서 소개되나요?',
    answer:
      '걱정하지 않으셔도 됩니다.\n\n처음 오신 분이 불편하시지 않도록 배려합니다. 원치 않으시면 따로 일어나거나 소개하지 않으셔도 됩니다.',
  },
  {
    id: 'registration',
    question: '등록은 어떻게 하나요?',
    answer:
      '등록은 바로 결정하지 않으셔도 됩니다.\n\n예배에 함께하시며 교회를 천천히 알아가신 뒤, 등록을 원하실 때 목사님에게 편하게 문의해 주세요.',
  },
  {
    id: 'after-worship',
    question: '예배 후 바로 가도 되나요?',
    answer:
      '네, 괜찮습니다.\n\n예배 후 바로 돌아가셔도 괜찮고, 목사님과 인사를 나누셔도 좋습니다.',
  },
  {
    id: 'denomination',
    question: '혹시 이단이나 사이비 교회는 아닌가요?',
    answer:
      '네, 안심하고 방문하셔도 됩니다.\n\n하늘사랑교회는 기독교대한감리회에 소속된 교회로, 성경 말씀을 따라 하나님을 예배하고 예수 그리스도의 복음을 전하는 교회입니다.',
  },
]

export const CONTACT_INFO = {
  phone: LOCATION_DATA.phone,
  address: `${LOCATION_DATA.address} ${LOCATION_DATA.churchName}`,
  worshipSchedule: WORSHIP_SCHEDULE,
  worshipSchedulePath: '/worship',
  worshipGuidePath: '/worship-guide/sunday-blessing',
  locationPath: '/about/location',
}
