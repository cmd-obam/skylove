export const LOCATION_DATA = {
  address: '충청남도 천안시 동남구 통정8로 66',
  phone: '041-579-0191',
  churchName: '하늘사랑교회',
  sundayWorship: '주일예배 오전 11:00',
}

export const VISITOR_GUIDES = [
  {
    id: 'parking',
    title: '주차 안내',
    description:
      '교회 정문 앞 주차장과 건물 뒤편 주차 공간을 이용하실 수 있습니다. 주일에는 교통 안내 봉사자가 안내해 드립니다.',
    image: null,
  },
  {
    id: 'entrance',
    title: '입구 안내',
    description:
      '정문으로 들어오시면 안내 데스크와 예배 안내가 준비되어 있습니다. 처음 오신 분은 안내팀에 말씀해 주세요.',
    image: null,
  },
  {
    id: 'transit',
    title: '대중교통 안내',
    routes: [
      {
        bus: '7번 버스',
        stop: '신방한라',
        walk: '도보2분',
      },
    ],
    image: null,
  },
]
