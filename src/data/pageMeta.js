export const PAGE_META = {
  '/about': {
    title: '교회소개',
    subtitle: '하나님의 사랑으로 세워진 하늘사랑교회를 소개합니다',
  },
  '/about/history': {
    title: '교회역사',
    subtitle: '하늘사랑교회의 발자취를 소개합니다',
  },
  '/about/facility-vr': {
    title: '시설둘러보기(VR)',
    subtitle: '교회 시설을 가상으로 둘러보세요',
  },
  '/about/location': {
    title: '찾아오시는 길',
    subtitle: '하늘사랑교회는 언제나 여러분을 기다리고 있습니다.',
  },
  '/worship': {
    title: '예배시간 안내',
    subtitle: '하나님을 만나는 은혜로운 시간',
  },
  '/worship-guide/sunday-blessing': {
    title: '주일 축복 예배',
    subtitle: '주일 축복 예배를 안내합니다',
  },
  '/worship-guide/sunday-praise': {
    title: '주일찬양예배',
    subtitle: '주일찬양예배를 안내합니다',
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
    title: '엘샤다이찬양단',
    subtitle: '엘샤다이찬양단을 소개합니다',
  },
  '/worship-guide/cell-meeting': {
    title: '셀모임',
    subtitle: '셀모임을 안내합니다',
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
  '/sunday-school': {
    title: '교회학교',
    subtitle: '교회학교 프로그램을 안내합니다',
  },
  '/church-news': {
    title: '교회소식',
    subtitle: '하늘사랑교회의 새로운 소식을 전합니다',
  },
  '/church-news/album': {
    title: '교회앨범',
    subtitle: '하늘사랑교회의 소중한 순간들을 나눕니다',
  },
  '/church-news/new-family': {
    title: '새가족안내',
    subtitle: '새가족을 위한 안내를 제공합니다',
  },
  '/church-news/event-photos': {
    title: '행사사진',
    subtitle: '교회 행사와 다양한 활동 사진을 소개합니다.',
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
