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
    title: '예배안내',
    subtitle: '하나님을 만나는 은혜로운 시간',
  },
  '/word-worship': {
    title: '말씀&찬양',
    subtitle: '말씀과 찬양 콘텐츠를 안내합니다',
  },
  '/fellowship': {
    title: '나눔&교제',
    subtitle: '나눔과 교제 활동을 안내합니다',
  },
  '/sunday-school': {
    title: '교회학교',
    subtitle: '교회학교 프로그램을 안내합니다',
  },
  '/church-life/album': {
    title: '교회앨범',
    subtitle: '하늘사랑교회의 소중한 순간들을 나눕니다',
  },
  '/church-life/service': {
    title: '전도 및 섬김',
    subtitle: '전도와 섬김의 현장을 소개합니다',
  },
  '/church-life/worship-praise': {
    title: '예배와 찬양',
    subtitle: '예배와 찬양의 모습을 전합니다',
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
