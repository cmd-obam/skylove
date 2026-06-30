export const LOCATION_DATA = {
  address: '충청남도 천안시 동남구 통정8로 66',
  phone: '041-579-0191',
  churchName: '하늘사랑교회',
}

export const LOCATION_INFO_BANNER = {
  directionsTitle: '오시는 길',
  phoneTitle: '문의전화',
  phoneDescription: '교회 방문 및 예배 문의',
  phoneHoursLabel: '문의 가능 시간',
  phoneHours: '평일 오전 10시 ~ 오후 5시',
  worshipTitle: '예배시간 안내',
  worshipLinkLabel: '예배 안내 자세히 보기',
  worshipColumns: [
    [
      { id: 'sunday-blessing', name: '주일축복예배', time: '오전 11시' },
      { id: 'sunday-praise', name: '주일찬양예배', time: '오후 1시 20분' },
      { id: 'wednesday', name: '수요 예배', time: '오후 7시 30분' },
    ],
    [
      { id: 'dawn-prayer', name: '새벽기도', time: '오전 5시 30분', timeSub: '화-토' },
      { id: 'sunday-cell', name: '주일 셀 모임', time: '오후 1시', timeSub: '마지막주 일요일' },
    ],
  ],
}

export function getMapLinks() {
  return {
    naver:
      'https://map.naver.com/p/entry/place/13129595?placePath=%2Fhome&c=15.00,0,0,0,dh',
    kakao: 'https://place.map.kakao.com/17803934',
  }
}

export const ACCESS_GUIDES = {
  car: {
    title: '자가용 이용 시',
    subtitle: '서천안IC에서 출발 시',
    description: '하늘사랑감리교회까지 차량 약 14분 소요됩니다.',
    parkingNote: '교회 주차장을 이용하실 수 있습니다.',
  },
  bus: {
    title: '버스 이용 시',
    routes: [
      {
        id: 'cheonan',
        direction: '천안 시내 방면',
        bus: '7번 버스',
        stop: '신방한라비발디아파트 하차',
        walk: '약 2분',
      },
      {
        id: 'pungse',
        direction: '풍세·광덕 방면',
        bus: '600번대 버스',
        stop: '신방한라비발디후문 하차',
        walk: '약 3분',
      },
    ],
  },
}
