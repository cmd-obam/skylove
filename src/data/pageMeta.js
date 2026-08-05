export const PAGE_META = {
  '/about': {
    title: '담임목사 인사',
    subtitle: '하나님의 사랑으로 세워진 하늘사랑교회를 소개합니다',
  },
  '/about/people': {
    title: '섬기는 사람들',
    subtitle: '하늘사랑교회 직분자를 소개합니다',
  },
  '/about/people/clergy': {
    title: '섬기는 사람들',
    subtitle: '하늘사랑교회 직분자를 소개합니다',
  },
  '/about/people/ministers': {
    title: '섬기는 사람들',
    subtitle: '하늘사랑교회 사역자를 소개합니다',
  },
  '/about/history': {
    title: '교회역사',
    subtitle: '',
  },
  '/about/facility-vr': {
    title: 'VR 둘러보기',
    subtitle: '교회 시설을 가상으로 둘러보세요',
  },
  '/about/facilities': {
    title: '교회시설 안내',
    subtitle: '',
  },
  '/about/location': {
    title: '찾아오시는 길',
    subtitle: '하늘사랑교회는 언제나 여러분을 기다리고 있습니다.',
  },
  '/worship': {
    title: '예배시간 안내',
    subtitle: '예배의 자리로 초대합니다',
    subtitleLines: [
      '예배의 자리로 초대합니다',
      '말씀과 찬양 안에서 쉼을 누리며',
      '하나님의 사랑을 함께 나누어요.',
    ],
  },
  '/worship-guide/sunday-blessing': {
    title: '주일 축복 예배',
    subtitle: '주일 축복 예배를 안내합니다',
  },
  '/worship-guide/sunday-blessing/communion': {
    title: '성찬식',
    subtitle: '주일 축복 예배 성찬식을 안내합니다',
  },
  '/worship-guide/sunday-praise': {
    title: '주일 찬양 예배',
    subtitle: '주일 찬양 예배를 안내합니다',
  },
  '/worship-guide/wednesday': {
    title: '수요예배',
    subtitle: '수요예배를 안내합니다',
  },
  '/worship-guide/dawn-prayer': {
    title: '새벽기도',
    subtitle: '새벽기도를 안내합니다',
  },
  '/worship-guide/el-shaddai-choir': {
    title: '엘샤다이 찬양단',
    subtitle: '엘샤다이 찬양단을 소개합니다',
  },
  '/worship-guide/cell-meeting': {
    title: '셀모임',
    subtitle: '셀모임을 안내합니다',
  },
  '/worship-word/sunday': {
    title: '주일예배',
    subtitle: '주일예배 말씀을 영상으로 나눕니다.',
  },
  '/worship-word/el-shaddai': {
    title: '엘샤다이 찬양단',
    subtitle: '엘샤다이 찬양단 영상을 나눕니다.',
  },
  '/worship-word/sunday/write': {
    title: '주일예배 등록',
    subtitle: '',
  },
  '/worship-word/el-shaddai/write': {
    title: '엘샤다이 찬양단 등록',
    subtitle: '',
  },
  '/education': {
    title: '교육&양육',
    subtitle: '교육과 양육 프로그램을 안내합니다',
  },
  '/mission': {
    title: '전도&선교',
    subtitle: '전도와 선교 사역을 소개합니다',
  },
  '/fellowship': {
    title: '나눔&교제',
    subtitle: '나눔과 교제 활동을 안내합니다',
  },
  '/church-news': {
    title: '교회소식',
    subtitle: '하늘사랑교회의 새로운 소식을 전합니다',
  },
  '/church-news/pastor-story': {
    title: '담임목사 이야기',
    subtitle: '담임목사의 이야기를 전합니다.',
  },
  '/church-news/album': {
    title: '교회앨범',
    subtitle: '교회 행사와 다양한 활동 사진을 소개합니다.',
  },
  '/news/write': {
    title: '교회소식 글쓰기',
    subtitle: '',
  },
  '/pastor-story/write': {
    title: '담임목사 이야기 글쓰기',
    subtitle: '',
  },
  '/album/write': {
    title: '교회앨범 등록',
    subtitle: '',
  },
  '/new-family': {
    title: '새가족 안내',
    subtitle: '새가족을 위한 안내를 제공합니다',
  },
}

export function getPageMeta(pathname) {
  return (
    PAGE_META[pathname] ?? {
      title: '페이지',
      subtitle: '',
    }
  )
}
