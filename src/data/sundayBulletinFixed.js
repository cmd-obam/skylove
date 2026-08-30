/**
 * 주일예배 주보 — 고정 영역 (매주 수정하지 않음)
 */
export const SUNDAY_BULLETIN_FIXED = {
  serviceTitle: '주일축복예배',
  serviceTime: '오전 11시',
  moderator: '최석림목사',
  missionTitle: '사명선언문',
  missionLines: [
    '예수그리스도의',
    '사랑을 가지고',
    '세상으로 나가',
    '죽어가는 영혼을',
    '구원하는 교회',
  ],
  graceChoir: '엘샤다이중창단',
  orderFixed: {
    worshipPraise: '이헤븐 찬양단',
    doxology: '[635장] 하늘에 계신 우리 아버지',
    offeringPraise: '나의 주 나의 하나님이여',
    offeringPrayer: '담임목사 축복기도(드려진헌금위해)',
    benediction: '담임목사',
  },
  servingPeople: [
    { role: '사역자', name: '모든 성도' },
    { role: '간 사', name: '이재연(반주자)' },
    { role: '마라나타 찬양대장', name: '정지은' },
    { role: '이 헤븐 찬양단장', name: '최성민' },
    { role: '엘샤다이 중창단장', name: '이재연' },
  ],
  missions: {
    lines: ['국내선교 경기연회 성은교회', '비전교회 협력'],
    denomination: '기독교대한감리회',
    churchName: '하늘사랑교회',
  },
}

export const SUNDAY_BULLETIN_WEEKLY_FIELDS = [
  {
    key: 'seasonWeek',
    label: '성령강림절 후 제 ○○주',
    placeholder: '예: 성령강림절 후 제 14 주',
    hint: '주보에는 “성령강림절 후” / “제 14 주” 두 줄로 표시됩니다.',
    multiline: false,
  },
  {
    key: 'callToWorship',
    label: '예배의 부름',
    placeholder: '예배의 부름 내용을 입력해 주세요.',
    multiline: false,
  },
  {
    key: 'prayer',
    label: '오늘의 기도',
    placeholder: '기도 담당자 또는 내용을 입력해 주세요.',
    multiline: false,
  },
  {
    key: 'praise',
    label: '찬양',
    placeholder: '예: [134장] 나 어느 날 꿈속을 헤매며',
    multiline: false,
  },
  {
    key: 'responsiveReading',
    label: '교독문',
    placeholder: '예: 74번 마태복음 5장',
    multiline: false,
  },
  {
    key: 'graceSong',
    label: '은혜의통로 (찬송 제목)',
    placeholder: '예: “손 잡고 함께 가세”',
    multiline: false,
    hint: '오른쪽 “엘샤다이중창단”은 고정입니다.',
  },
  {
    key: 'fellowship',
    label: '교제와소식',
    placeholder: '교제와소식 내용을 입력해 주세요.',
    multiline: false,
  },
  {
    key: 'scripture',
    label: '성경봉독',
    placeholder: '예: 역대상 4:9~10 (구 614)',
    multiline: false,
  },
  {
    key: 'sermon',
    label: '임재의말씀',
    placeholder: '설교 제목을 입력해 주세요.',
    multiline: false,
  },
  {
    key: 'closingPraise',
    label: '결단의찬양',
    placeholder: '예: [545장] 이 세상 끝날까지',
    multiline: false,
  },
  {
    key: 'churchNews',
    label: '교회소식',
    placeholder: '교회소식을 입력해 주세요. (줄바꿈 가능)',
    multiline: true,
  },
]
