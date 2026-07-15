import historySanctuary1 from '@/assets/images/about/history/sanctuary-1.png'
import historySanctuary2 from '@/assets/images/about/history/sanctuary-2.png'
import historySanctuary3 from '@/assets/images/about/history/sanctuary-3.png'
import history2025StreetCleaning from '@/assets/images/about/history/2025-street-cleaning.png'
import history2025PhilippinesMission from '@/assets/images/about/history/2025-philippines-mission.png'
import history2025ChristmasBaptism from '@/assets/images/about/history/2025-christmas-baptism.png'
import history2026JapanMission from '@/assets/images/about/history/2026-japan-mission.png'

export const CHURCH_HISTORY_INTRO = {
  lines: [
    '하나님의 은혜와 인도하심으로 오늘까지 걸어온',
    '하늘사랑교회의 발자취를 소개합니다.',
  ],
}

export const CHURCH_HISTORY_PERIODS = [
  {
    id: '2009-2012',
    period: '2009~2012',
    title: '개척과 섬김 이전',
    category: 'pioneering',
    events: [
      {
        date: '2009. 1. 4.',
        name: '하늘사랑교회 첫 예배',
        description: '쌍용동 한 성도 가정에서 10명이 모여 하늘사랑교회 첫 예배를 드렸습니다.',
      },
      {
        date: '2009. 2. 8.',
        name: '제1성전 첫 예배',
        description: '쌍용동 1652번지 3층 56평에서 제1성전 첫 예배를 드렸습니다.',
      },
      {
        date: '2009. 4. 26.',
        name: '교회 창립예배',
        description: '15명이 출석한 가운데 교회 창립예배를 드렸습니다.',
      },
      {
        date: '2009. 4. 27.',
        name: '하늘사랑교회 창립예배',
        description: '할렐루야교회 담임 김상복 목사님을 초청하여 하늘사랑교회 창립예배를 드렸습니다.',
      },
      {
        date: '2009. 12. 24.',
        name: '아프리카 모잠비크 세라이카 교회 건축',
        description: '하늘사랑교회가 아프리카 모잠비크 세라이카 교회를 건축하였습니다.',
      },
      {
        date: '2009. 12. 24.',
        name: '제2성전 첫 예배',
        description: '제2성전인 신방동 74-62번지 3층 120평에서 첫 예배를 드렸습니다.',
      },
      {
        date: '2010. 10. 10.',
        name: '1010 이웃초청 전교인 체육대회',
        description:
          '1010 이웃초청 전교인 체육대회를 개최하여 동정지구 인라인경기장에서 80여 명이 참석하였습니다.',
      },
      {
        date: '2012. 1. 10.',
        name: '성전 매입',
        description: '신방동 1957번지, 구 동심교회 성전을 매입하였습니다.',
      },
      {
        date: '2012. 1. 22.',
        name: '제3성전 첫 예배',
        description: '신방동 제3성전에서 첫 예배를 드렸습니다.',
      },
    ],
    photos: [
      { id: 'sanctuary-1', src: historySanctuary1, caption: '2009. 2월 제 1성전' },
      { id: 'sanctuary-2', src: historySanctuary2, caption: '2009. 12월 제 2성전' },
      { id: 'sanctuary-3', src: historySanctuary3, caption: '2012. 1월 제 3성전' },
    ],
  },
  {
    id: '2016-2022',
    period: '2016~2022',
    title: '공간 확장과 더 숲 카페',
    category: 'space-cafe',
    events: [
      {
        date: '2016. 7. 12.',
        name: '목사관 증축',
        description: '3층 목사관을 증축하였습니다.',
      },
      {
        date: '2022. 8. 7.',
        name: '더 숲 카페 조성',
        description:
          '1층 애찬실을 카페로 리모델링하는 공사를 시작하여 더 숲 카페를 조성하였습니다.',
      },
    ],
    photos: [],
  },
  {
    id: '2023',
    period: '2023',
    title: '지역 섬김과 공동체의 발자취',
    category: 'community',
    events: [
      {
        date: '2023. 3. 26.',
        name: '전도 거리 청소',
        description: '중앙공원 일대 거리 청소를 통해 지역사회 섬김과 전도 사역을 실천하였습니다.',
      },
      {
        date: '2023. 10. 29.',
        name: '전교인 체육대회',
        description: '성도 간 교제와 화합을 위한 전교인 체육대회를 진행하였습니다.',
      },
      {
        date: '2023. 12. 25.',
        name: '성탄절 세례예식',
        description: '유아세례 노은, 장년세례 한재석 성도가 세례를 받았습니다.',
      },
    ],
    photos: [],
  },
  {
    id: '2025-2026',
    period: '2025~2026',
    title: '전도와 다음 걸음',
    category: 'evangelism',
    events: [
      {
        date: '2025. 6. 29.',
        name: '전도 거리 청소',
        description: '주일 오후에 전도 거리 청소를 진행하였습니다.',
      },
      {
        date: '2025. 7. 13. ~ 7. 19.',
        name: '담임목사님 필리핀 선교',
        description:
          '담임목사님이 필리핀 빈민촌 마을과 현지 교회를 방문하여 선교 사역을 하셨습니다.',
      },
      {
        date: '2025. 12. 25.',
        name: '성탄절 세례예식',
        description: '장년세례 박초희, 한찬우 성도가 세례를 받았습니다.',
      },
      {
        date: '2026. 3. 1. ~ 3. 4.',
        name: '일본 단기선교',
        description:
          '일본 치바영광교회를 방문하여 현지 교회와 연합예배 및 단기선교 사역을 진행하였으며, 성도 10명이 참여하였습니다.',
      },
    ],
    photos: [
      {
        id: '2025-street-cleaning',
        src: history2025StreetCleaning,
        caption: '전도 거리 청소',
      },
      {
        id: '2025-philippines-mission',
        src: history2025PhilippinesMission,
        caption: '담임목사님 필리핀 선교',
      },
      {
        id: '2025-christmas-baptism',
        src: history2025ChristmasBaptism,
        caption: '성탄절 세례예식',
      },
      {
        id: '2026-japan-mission',
        src: history2026JapanMission,
        caption: '일본 단기선교',
      },
    ],
  },
]
