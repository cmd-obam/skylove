/**
 * 주일예배 주보 — 고정 영역 기본값
 */
export const SUNDAY_BULLETIN_FIXED = {
  serviceTitle: '주일축복예배',
  serviceTime: '오전 11시',
  moderator: '최석림목사',
  seasonPrefix: '성령강림절 후',
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
    callToWorship: '나의 믿음 주께 있네',
    doxology: '[635장] 하늘에 계신 우리 아버지',
    offeringPraise: '나의 주 나의 하나님이여',
    offeringPrayer: '담임목사 축복기도(드려진헌금위해)',
    fellowship: '당신은 하나님의 언약 안에 있는',
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

/**
 * 주보 작성 양식 전체 목록 (주보 표시 순서에 맞춤)
 * - lockable: true → 우측 체크박스로 고정/수정 전환 (기본 체크=고정)
 * - lockable 없음 → 매주 직접 입력 항목
 */
export const SUNDAY_BULLETIN_FORM_FIELDS = [
  {
    key: 'serviceTitle',
    label: '예배 제목',
    lockable: true,
    multiline: false,
    getDefault: () => SUNDAY_BULLETIN_FIXED.serviceTitle,
  },
  {
    key: 'serviceTime',
    label: '예배 시간',
    lockable: true,
    multiline: false,
    getDefault: () => SUNDAY_BULLETIN_FIXED.serviceTime,
  },
  {
    key: 'moderator',
    label: '사회',
    lockable: true,
    multiline: false,
    getDefault: () => SUNDAY_BULLETIN_FIXED.moderator,
  },
  {
    key: 'seasonPrefix',
    label: '절기 문구',
    lockable: true,
    multiline: false,
    getDefault: () => SUNDAY_BULLETIN_FIXED.seasonPrefix,
  },
  {
    key: 'seasonWeek',
    label: '성령강림절 후 제 ○○주',
    placeholder: '예: 14',
    hint: '주차 숫자만 입력하세요. 주보에는 절기 문구 / “제 ○○ 주”로 표시됩니다.',
    type: 'seasonWeekNumber',
    multiline: false,
  },
  {
    key: 'missionTitle',
    label: '사명선언문 제목',
    lockable: true,
    multiline: false,
    getDefault: () => SUNDAY_BULLETIN_FIXED.missionTitle,
  },
  {
    key: 'missionLines',
    label: '사명선언문',
    lockable: true,
    multiline: true,
    rows: 5,
    hint: '한 줄에 한 문장씩 입력하세요.',
    getDefault: () => SUNDAY_BULLETIN_FIXED.missionLines.join('\n'),
  },
  {
    key: 'worshipPraise',
    label: '경배와찬양',
    lockable: true,
    multiline: false,
    getDefault: () => SUNDAY_BULLETIN_FIXED.orderFixed.worshipPraise,
  },
  {
    key: 'callToWorship',
    label: '예배의부름',
    lockable: true,
    multiline: false,
    getDefault: () => SUNDAY_BULLETIN_FIXED.orderFixed.callToWorship,
  },
  {
    key: 'prayer',
    label: '오늘의 기도',
    placeholder: '기도 담당자 또는 내용을 입력해 주세요.',
    multiline: false,
  },
  {
    key: 'doxology',
    label: '송영',
    lockable: true,
    multiline: false,
    getDefault: () => SUNDAY_BULLETIN_FIXED.orderFixed.doxology,
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
    key: 'offeringPraise',
    label: '봉헌찬양',
    lockable: true,
    multiline: false,
    getDefault: () => SUNDAY_BULLETIN_FIXED.orderFixed.offeringPraise,
  },
  {
    key: 'offeringPrayer',
    label: '봉헌기도',
    lockable: true,
    multiline: false,
    getDefault: () => SUNDAY_BULLETIN_FIXED.orderFixed.offeringPrayer,
  },
  {
    key: 'graceSong',
    label: '은혜의통로 (찬송 제목)',
    placeholder: '예: “손 잡고 함께 가세”',
    multiline: false,
  },
  {
    key: 'graceChoir',
    label: '엘샤다이중창단',
    lockable: true,
    multiline: false,
    getDefault: () => SUNDAY_BULLETIN_FIXED.graceChoir,
  },
  {
    key: 'fellowship',
    label: '교제와소식',
    lockable: true,
    multiline: false,
    getDefault: () => SUNDAY_BULLETIN_FIXED.orderFixed.fellowship,
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
    key: 'benediction',
    label: '축도',
    lockable: true,
    multiline: false,
    getDefault: () => SUNDAY_BULLETIN_FIXED.orderFixed.benediction,
  },
  {
    key: 'churchNews',
    label: '교회소식',
    placeholder: '교회소식을 입력해 주세요. (줄바꿈 가능)',
    multiline: true,
    rows: 10,
  },
  {
    key: 'servingPeople',
    label: '섬기는사람',
    lockable: true,
    multiline: true,
    rows: 6,
    hint: '한 줄에 “역할: 이름” 형식으로 입력하세요.',
    getDefault: () =>
      SUNDAY_BULLETIN_FIXED.servingPeople
        .map((item) => `${item.role}: ${item.name}`)
        .join('\n'),
  },
  {
    key: 'missionsLines',
    label: '선교및후원 (본문)',
    lockable: true,
    multiline: true,
    rows: 3,
    hint: '한 줄에 한 항목씩 입력하세요.',
    getDefault: () => SUNDAY_BULLETIN_FIXED.missions.lines.join('\n'),
  },
  {
    key: 'missionsDenomination',
    label: '교단명',
    lockable: true,
    multiline: false,
    getDefault: () => SUNDAY_BULLETIN_FIXED.missions.denomination,
  },
  {
    key: 'missionsChurchName',
    label: '교회명',
    lockable: true,
    multiline: false,
    getDefault: () => SUNDAY_BULLETIN_FIXED.missions.churchName,
  },
]

/** 호환용 — 전체 양식은 SUNDAY_BULLETIN_FORM_FIELDS 사용 */
export const SUNDAY_BULLETIN_WEEKLY_FIELDS = SUNDAY_BULLETIN_FORM_FIELDS.filter(
  (field) => !field.lockable,
)

export const SUNDAY_BULLETIN_LOCKABLE_FIELDS = SUNDAY_BULLETIN_FORM_FIELDS.filter(
  (field) => field.lockable,
)

export const SUNDAY_BULLETIN_LOCKABLE_KEYS = SUNDAY_BULLETIN_LOCKABLE_FIELDS.map(
  (field) => field.key,
)
