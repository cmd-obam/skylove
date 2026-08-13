/**
 * 섬기는 사람들 데이터
 *
 * 향후 최고관리자 CMS 연동을 위해 사람/그룹을 독립 id·sortOrder로 구성합니다.
 * - person.photoUrl: null이면 Placeholder, URL/경로가 있으면 해당 이미지 표시
 * - groups[].people / subgroups[].people 순서는 sortOrder 기준
 */

import kimHyemiPhoto from '@/assets/images/serving-people/kim-hyemi.jpg'
import hanChanwooPhoto from '@/assets/images/serving-people/han-chanwoo.jpg'
import kimNamyeonPhoto from '@/assets/images/serving-people/kim-namyeon.jpg'
import kimYeongseongPhoto from '@/assets/images/serving-people/kim-yeongseong.jpg'
import simMinseopPhoto from '@/assets/images/serving-people/sim-minseop.jpg'
import choiSeongminPhoto from '@/assets/images/serving-people/choi-seongmin.jpg'
import hanJaeseokPhoto from '@/assets/images/serving-people/han-jaeseok.jpg'
import choiSeokrimPhoto from '@/assets/images/serving-people/choi-seokrim.jpg'
import kimYeongaePhoto from '@/assets/images/serving-people/kim-yeongae.jpg'
import kimHyegyeongPhoto from '@/assets/images/serving-people/kim-hyegyeong.jpg'
import jeongJiyePhoto from '@/assets/images/serving-people/jeong-jiye.png'

export const SERVING_PEOPLE_PAGE_INTRO = {
  title: '섬기는 사람들',
  subtitle: '하늘사랑교회 직분자를 소개합니다',
}

/** @typedef {{ id: string, name: string, role: string, photoUrl: string | null, sortOrder: number }} ServingPerson */
/** @typedef {{ id: string, title: string, people: ServingPerson[] }} ServingSubgroup */
/** @typedef {{ id: string, title: string, sortOrder: number, people?: ServingPerson[], subgroups?: ServingSubgroup[] }} ServingGroup */

/** @type {ServingGroup[]} */
export const CLERGY_GROUPS = [
  {
    id: 'pastor-pair',
    title: '',
    hideHeader: true,
    sortOrder: 1,
    layout: 'praise-row',
    subgroups: [
      {
        id: 'senior-pastor',
        title: '담임목사',
        people: [
          {
            id: 'clergy-choi-seokrim',
            name: '최석림',
            role: '담임목사',
            photoUrl: choiSeokrimPhoto,
            sortOrder: 1,
          },
        ],
      },
      {
        id: 'pastor-wife',
        title: '사모님',
        people: [
          {
            id: 'clergy-kim-yeongae',
            name: '김영애',
            role: '사모님',
            photoUrl: kimYeongaePhoto,
            sortOrder: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'elder-deaconess',
    title: '원로권사',
    sortOrder: 2,
    people: [
      {
        id: 'clergy-kim-jinsun',
        name: '김진순',
        role: '원로권사',
        photoUrl: null,
        sortOrder: 1,
      },
    ],
  },
  {
    id: 'deaconess',
    title: '권사',
    sortOrder: 3,
    people: [
      {
        id: 'clergy-jo-changgyeong',
        name: '조창경',
        role: '권사',
        photoUrl: null,
        sortOrder: 1,
      },
      {
        id: 'clergy-kim-yeongseong',
        name: '김영성',
        role: '권사',
        photoUrl: kimYeongseongPhoto,
        sortOrder: 2,
      },
      {
        id: 'clergy-kang-jungu',
        name: '강준구',
        role: '권사',
        photoUrl: null,
        sortOrder: 3,
      },
      {
        id: 'clergy-kim-hyegyeong',
        name: '김혜경',
        role: '권사',
        photoUrl: kimHyegyeongPhoto,
        sortOrder: 4,
      },
    ],
  },
  {
    id: 'deacon',
    title: '집사',
    sortOrder: 4,
    people: [
      {
        id: 'clergy-jeong-jieun',
        name: '정지은',
        role: '집사',
        photoUrl: null,
        sortOrder: 1,
      },
      {
        id: 'clergy-jin-hanhyo',
        name: '진한효',
        role: '집사',
        photoUrl: null,
        sortOrder: 2,
      },
      {
        id: 'clergy-lee-jaeyeon',
        name: '이재연',
        role: '집사',
        photoUrl: null,
        sortOrder: 3,
      },
      {
        id: 'clergy-kim-namyeon',
        name: '김남연',
        role: '집사',
        photoUrl: kimNamyeonPhoto,
        sortOrder: 4,
      },
    ],
  },
]

/** @type {ServingGroup[]} */
export const MINISTER_GROUPS = [
  {
    id: 'assistant',
    title: '간사',
    sortOrder: 1,
    people: [
      {
        id: 'minister-lee-jaeyeon',
        name: '이재연',
        role: '간사',
        photoUrl: null,
        sortOrder: 1,
      },
    ],
  },
  {
    id: 'praise',
    title: '찬양사역자',
    sortOrder: 2,
    layout: 'praise-row',
    subgroups: [
      {
        id: 'maranatha',
        title: '마라나타 찬양대',
        people: [
          {
            id: 'minister-jeong-jieun',
            name: '정지은',
            role: '대장/집사',
            photoUrl: null,
            sortOrder: 1,
          },
        ],
      },
      {
        id: 'iheaven',
        title: '이헤븐 찬양단',
        people: [
          {
            id: 'minister-choi-seongmin',
            name: '최성민',
            role: '단장/성도',
            photoUrl: choiSeongminPhoto,
            sortOrder: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'el-shaddai',
    title: '엘샤다이 중창단',
    sortOrder: 3,
    people: [
      {
        id: 'minister-lee-jaeyeon-choir',
        name: '이재연',
        role: '단장/집사',
        photoUrl: null,
        sortOrder: 1,
      },
      {
        id: 'minister-el-kim-hyeju',
        name: '김혜주',
        role: '단원',
        photoUrl: null,
        sortOrder: 2,
      },
      {
        id: 'minister-el-sim-minseop',
        name: '심민섭',
        role: '단원',
        photoUrl: simMinseopPhoto,
        sortOrder: 3,
      },
      {
        id: 'minister-el-jeong-jiye',
        name: '정지예',
        role: '단원',
        photoUrl: jeongJiyePhoto,
        sortOrder: 4,
      },
      {
        id: 'minister-el-choi-seongmin',
        name: '최성민',
        role: '단원',
        photoUrl: choiSeongminPhoto,
        sortOrder: 5,
      },
      {
        id: 'minister-el-han-jaeseok',
        name: '한재석',
        role: '단원',
        photoUrl: hanJaeseokPhoto,
        sortOrder: 6,
      },
      {
        id: 'minister-el-kang-jinmo',
        name: '강진모',
        role: '드럼',
        photoUrl: null,
        sortOrder: 7,
      },
    ],
  },
  {
    id: 'ministry-staff',
    title: '사역담당',
    sortOrder: 4,
    people: [
      {
        id: 'minister-kim-hyemi',
        name: '김혜미',
        role: '방송 및 영상담당',
        photoUrl: kimHyemiPhoto,
        sortOrder: 1,
      },
      {
        id: 'minister-han-chanwoo',
        name: '한찬우',
        role: '홈페이지 담당',
        photoUrl: hanChanwooPhoto,
        sortOrder: 2,
      },
    ],
  },
]

export function sortByOrder(items = []) {
  return [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}
