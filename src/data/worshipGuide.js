/**
 * 예배안내 페이지 콘텐츠
 * 이미지 URL(introImage, galleryImages)은 추후 관리자 업로드로 교체
 */
import sundayBlessingIntro from '@/assets/images/worship/sunday-blessing-intro.png'
import sundayBlessingHero from '@/assets/images/worship/sunday-blessing-hero.png'
import sundayBlessingGallery1 from '@/assets/images/worship/sunday-blessing-gallery-1.png'
import sundayBlessingGallery2 from '@/assets/images/worship/sunday-blessing-gallery-2.png'
import sundayBlessingGallery3 from '@/assets/images/worship/sunday-blessing-gallery-3.png'
import sundayPraiseIntro from '@/assets/images/worship/sunday-praise-intro.png'
import wednesdayIntro from '@/assets/images/worship/wednesday-intro.png'
import wednesdayHero from '@/assets/images/worship/wednesday-hero.png'
import wednesdayGallery1 from '@/assets/images/worship/wednesday-gallery-1.png'
import wednesdayGallery2 from '@/assets/images/worship/wednesday-gallery-2.png'
import wednesdayGallery3 from '@/assets/images/worship/wednesday-gallery-3.png'
import elShaddaiChoirHero from '@/assets/images/worship/el-shaddai-choir-hero.png'
import elShaddaiChoirIntro from '@/assets/images/worship/el-shaddai-choir-intro.png'
import cellMeetingIntro from '@/assets/images/worship/cell-meeting-intro.png'
import dawnPrayerIntro from '@/assets/images/worship/dawn-prayer-intro.png'
import dawnPrayerHero from '@/assets/images/worship/dawn-prayer-hero.png'
import dawnPrayerGallery1 from '@/assets/images/worship/dawn-prayer-gallery-1.png'
import dawnPrayerGallery2 from '@/assets/images/worship/dawn-prayer-gallery-2.png'
import dawnPrayerGallery3 from '@/assets/images/worship/dawn-prayer-gallery-3.png'
import communionHero from '@/assets/images/worship/communion-hero.png'
import communionIntro from '@/assets/images/worship/communion-intro.png'
import communionGallery1 from '@/assets/images/worship/communion-gallery-1.png'
import communionGallery2 from '@/assets/images/worship/communion-gallery-2.png'
import communionGallery3 from '@/assets/images/worship/communion-gallery-3.png'
import { WORSHIP_SCHEDULE } from '@/data/worship'

const WORSHIP_SCHEDULE_BY_PATH = {
  '/worship-guide/sunday-blessing': 'sunday-blessing',
  '/worship-guide/sunday-blessing/communion': 'sunday-blessing',
  '/worship-guide/sunday-praise': 'sunday-praise',
  '/worship-guide/wednesday': 'wednesday',
  '/worship-guide/dawn-prayer': 'dawn-prayer',
  '/worship-guide/cell-meeting': 'sunday-cell',
}

export const WORSHIP_GUIDE_CONTENT = {
  '/worship-guide/sunday-blessing': {
    title: '주일축복예배',
    subtitle: 'Sunday Blessing Service',
    time: '오전 11시',
    location: '대예배실',
    headlineLines: ['하나님의 은혜와', '축복이 머무는 예배'],
    introTitle: '주일 축복예배',
    descriptionLines: [
      '주일 축복예배는',
      '예배 가운데 임하시는',
      '하나님의 사랑과  은혜를',
      '함께 누리는 시간입니다.',
    ],
    heroImage: sundayBlessingHero,
    introImage: sundayBlessingIntro,
    introTypographyVariant: 'classic',
    galleryImages: [sundayBlessingGallery1, sundayBlessingGallery2, sundayBlessingGallery3],
    footerMessage:
      '하나님의 은혜가 가득한 주일, 온 가족이 함께 예배에 참석하시길 축복합니다.',
    crossIcon: null,
  },
  '/worship-guide/sunday-blessing/communion': {
    title: '성찬식',
    subtitle: 'Holy Communion',
    time: '오전 11시',
    location: '대예배실',
    headlineLines: ['예수 그리스도의', '몸과 피를 기억하는 예배'],
    introTitle: '성찬식',
    descriptionLines: [
      '성찬식은',
      '예수 그리스도의 몸과 피를 기념하며',
      '그리스도와 하나 되는',
      '은혜의 성례입니다.',
    ],
    heroImage: communionHero,
    introImage: communionIntro,
    introLayout: 'split',
    introTypographyVariant: 'classic',
    galleryImages: [communionGallery1, communionGallery2, communionGallery3],
    footerMessage:
      '성찬식을 통해 그리스도의 사랑과 은혜를 나누며, 함께 예배하시길 축복합니다.',
    crossIcon: null,
  },
  '/worship-guide/sunday-praise': {
    title: '주일찬양예배',
    subtitle: 'Sunday Praise Service',
    time: '오후 1시 20분',
    location: '대예배실',
    headlineLines: ['찬양에 마음을 담아', '주님께 드리는 예배'],
    introTitle: '주일 찬양예배',
    descriptionLines: [
      '주일 찬양예배는',
      '감사와 사랑의 고백을 찬양으로 올려드리며',
      '기쁨 가운데 주님을 높이는',
      '은혜의 시간입니다.',
    ],
    heroImage: null,
    introImage: sundayPraiseIntro,
    introTypographyVariant: 'classic',
    galleryImages: [null, null, null],
    footerMessage:
      '찬양으로 하나님께 영광 돌리는 주일, 함께 예배하며 은혜를 누리시길 바랍니다.',
    crossIcon: null,
  },
  '/worship-guide/wednesday': {
    title: '수요저녁예배',
    subtitle: 'Wednesday Night Service',
    time: '오후 7시 30분',
    location: '소예배실',
    headlineLines: ['한 주의 중심에서', '말씀 앞에 머무는 예배'],
    introTitle: '수요 예배',
    descriptionLines: [
      '수요 예배는',
      '한 주의 걸음을 잠시 멈추고',
      '말씀과 기도로 하나님 앞에 나아가며',
      '은혜와 새 힘을 얻는 시간입니다.',
    ],
    heroImage: wednesdayHero,
    introImage: wednesdayIntro,
    introBannerVariant: 'cross-top',
    introTypographyVariant: 'classic',
    galleryImages: [wednesdayGallery1, wednesdayGallery2, wednesdayGallery3],
    footerMessage:
      '한 주의 중심에서 하나님을 만나는 수요 저녁, 함께 예배하며 은혜를 나누시길 바랍니다.',
    crossIcon: null,
  },
  '/worship-guide/dawn-prayer': {
    title: '새벽기도',
    subtitle: 'Early Morning Prayer',
    time: '오전 5시 30분(화~토)',
    location: '소예배실',
    headlineRichLines: [
      [{ text: '주님과 함께하는' }],
      [{ text: '하루의 ' }, { text: '첫걸음', accent: true }],
    ],
    introTitle: '새벽기도',
    descriptionLines: [
      '하루의 첫 시간을 하나님께 드리며',
      '기도와 말씀 가운데',
      '새로운 힘과 소망을 얻는',
      '하늘사랑교회의 새벽기도입니다.',
    ],
    heroImage: dawnPrayerHero,
    introImage: dawnPrayerIntro,
    introBannerVariant: 'dawn-prayer',
    galleryImages: [dawnPrayerGallery1, dawnPrayerGallery2, dawnPrayerGallery3],
    footerMessage:
      '새벽의 고요 가운데 하나님을 만나는 시간, 함께 기도하며 하루를 시작하시길 바랍니다.',
    crossIcon: null,
  },
  '/worship-guide/el-shaddai-choir': {
    title: '엘샤다이 찬양단',
    subtitle: 'El Shaddai Praise Team',
    timeLabel: '사역',
    time: '찬양 사역',
    locationLabel: '사역시간',
    location: '주일축복예배 시',
    headlineLines: ['찬양으로', '하나님께 영광을'],
    introTitle: '엘샤다이 찬양단',
    descriptionParagraphs: [
      [
        { text: "'엘샤다이(El Shaddai)'는", accent: true },
        { text: ' 세상 모든 것을 가능하게 하시는 ' },
        { text: '전능하신 하나님', accent: true },
        { text: ', 우리의 모든 필요를 풍성히 ' },
        { text: '채우시는 하나님', accent: true },
        { text: '을 뜻합니다.' },
      ],
      [
        {
          text: '우리는 그 이름을 높여 찬양하며, 예배 가운데 성도들과 함께 하나님께 영광을 올려드리는 ',
        },
        { text: '하늘사랑교회', accent: true },
        { text: '의 찬양팀입니다.' },
      ],
    ],
    heroImage: elShaddaiChoirHero,
    introImage: elShaddaiChoirIntro,
    introBannerVariant: 'choir',
    showGallery: false,
    footerMessage:
      '찬양으로 하나님께 영광 돌리는 엘샤다이 찬양단, 함께 예배하며 은혜를 누리시길 바랍니다.',
    crossIcon: null,
  },
  '/worship-guide/cell-meeting': {
    title: '셀모임',
    subtitle: 'Cell Group Meeting',
    time: '오후 1시 (마지막주 일요일)',
    location: '셀별 모임장소',
    headlineLines: ['삶을 나누고', '믿음을 세우는 공동체'],
    introTitle: '셀모임',
    descriptionLines: [
      '셀모임은 삶과 신앙을 함께 나누며',
      '말씀과 기도로 서로를 격려하고',
      '믿음 안에서 함께 성장해 가는',
      '하늘사랑교회의 소그룹 공동체입니다.',
    ],
    heroImage: null,
    introImage: cellMeetingIntro,
    introBannerVariant: 'choir',
    showGallery: false,
    footerMessage:
      '작은 공동체 가운데서 함께 성장하는 셀모임, 따뜻한 교제로 하나님의 사랑을 나누시길 바랍니다.',
    crossIcon: null,
  },
}

export function getWorshipGuideContent(pathname) {
  const content = WORSHIP_GUIDE_CONTENT[pathname] ?? null

  if (!content) {
    return null
  }

  const scheduleId = WORSHIP_SCHEDULE_BY_PATH[pathname]

  if (!scheduleId) {
    return content
  }

  const schedule = WORSHIP_SCHEDULE.find((item) => item.id === scheduleId)

  if (!schedule) {
    return content
  }

  return {
    ...content,
    time: content.time ?? schedule.time,
    location: content.location ?? schedule.location,
  }
}
