/**
 * 예배안내 페이지 콘텐츠
 * 이미지 URL(heroImage, introImage, galleryImages)은 추후 관리자 업로드로 교체
 */
export const WORSHIP_GUIDE_CONTENT = {
  '/worship-guide/sunday-blessing': {
    title: '주일축복예배',
    subtitle: 'WORSHIP',
    time: '주일 오전 11시',
    location: '하늘사랑교회 본당',
    headline: '하나님을 사랑하고 이웃을 사랑하는 예배',
    description:
      '주일 온가족예배는 모든 세대가 함께 모여 찬양과 말씀으로 하나님께 나아가는 공동체 예배입니다.',
    heroImage: null,
    introImage: null,
    galleryImages: [null, null, null],
    galleryTitles: ['찬양', '말씀', '교제'],
    footerMessage:
      '하나님의 은혜가 가득한 주일, 온 가족이 함께 예배에 참석하시길 축복합니다.',
    crossIcon: null,
  },
  '/worship-guide/sunday-praise': {
    title: '주일찬양예배',
    subtitle: 'WORSHIP',
    time: '주일 오후 2시',
    location: '하늘사랑교회 본당',
    headline: '찬양으로 하나님께 영광을 돌리는 예배',
    description:
      '주일 찬양 예배는 모든 성도가 함께 찬양하며 하나님을 높이고, 은혜를 나누는 시간입니다.',
    heroImage: null,
    introImage: null,
    galleryImages: [null, null, null],
    galleryTitles: ['찬양', '말씀', '교제'],
    footerMessage:
      '찬양으로 하나님께 영광 돌리는 주일, 함께 예배하며 은혜를 누리시길 바랍니다.',
    crossIcon: null,
  },
  '/worship-guide/wednesday': {
    title: '수요저녁예배',
    subtitle: 'WORSHIP',
    time: '수요일 오후 7시 30분',
    location: '하늘사랑교회 본당',
    headline: '한 주의 중심에 세워지는 예배',
    description:
      '수요 저녁예배는 한 주간의 삶 가운데 말씀과 기도로 새 힘을 얻고, 공동체로 함께하는 시간입니다.',
    heroImage: null,
    introImage: null,
    galleryImages: [null, null, null],
    galleryTitles: ['기도', '말씀', '교제'],
    footerMessage:
      '한 주의 중심에서 하나님을 만나는 수요 저녁, 함께 예배하며 은혜를 나누시길 바랍니다.',
    crossIcon: null,
  },
  '/worship-guide/dawn-prayer': {
    title: '새벽기도',
    subtitle: 'PRAYER',
    time: '월~금 오전 5시',
    location: '하늘사랑교회 본당',
    headline: '하루의 시작, 기도로 여는 아침',
    description:
      '새벽기도는 하루를 시작하며 하나님께 마음을 올리고, 말씀으로 새 힘을 얻는 시간입니다.',
    heroImage: null,
    introImage: null,
    galleryImages: [null, null, null],
    galleryTitles: ['기도', '말씀', '교제'],
    footerMessage:
      '새벽의 고요 가운데 하나님을 만나는 시간, 함께 기도하며 하루를 시작하시길 바랍니다.',
    crossIcon: null,
  },
  '/worship-guide/cell-meeting': {
    title: '셀모임',
    subtitle: 'FELLOWSHIP',
    time: '셀별 상이',
    location: '각 셀 모임 장소',
    headline: '말씀과 나눔으로 세워지는 공동체',
    description:
      '셀모임은 소그룹 가운데서 말씀을 나누고, 서로를 돌보며, 함께 성장하는 교제의 자리입니다.',
    heroImage: null,
    introImage: null,
    galleryImages: [null, null, null],
    galleryTitles: ['나눔', '말씀', '교제'],
    footerMessage:
      '작은 공동체 가운데서 함께 성장하는 셀모임, 따뜻한 교제로 하나님의 사랑을 나누시길 바랍니다.',
    crossIcon: null,
  },
}

export function getWorshipGuideContent(pathname) {
  return WORSHIP_GUIDE_CONTENT[pathname] ?? null
}
