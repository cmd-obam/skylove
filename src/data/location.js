export const LOCATION_DATA = {
  address: '충청남도 천안시 동남구 통정8로 66',
  phone: '041-579-0191',
  churchName: '하늘사랑교회',
}

export function getMapLinks() {
  const { address, churchName } = LOCATION_DATA
  const searchQuery = encodeURIComponent(`${churchName} ${address}`)

  return {
    naver: `https://map.naver.com/v5/search/${searchQuery}`,
    kakao: `https://map.kakao.com/link/search/${searchQuery}`,
  }
}

export const ACCESS_GUIDES = {
  car: {
    title: '자가용 이용 시',
    subtitle: '서천안IC에서 출발 시',
    description: '하늘사랑감리교회까지 차량 약 14분 소요됩니다.',
    parkingNote: '교회 내 주차장을 이용하실 수 있습니다.',
  },
  bus: {
    title: '버스 이용 시',
    routes: [
      {
        id: 'cheonan',
        direction: '천안 시내 방면',
        bus: '7번 버스',
        stop: '신방도서관 인근 하차',
        walk: '약 2분',
      },
      {
        id: 'pungse',
        direction: '풍세·광덕 방면',
        bus: '600번대 버스',
        stop: '신방도서관 인근 하차',
        walk: '약 3분',
      },
    ],
  },
}
