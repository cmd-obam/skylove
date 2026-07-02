/**
 * 시설안내 페이지 콘텐츠
 * image 필드는 추후 실제 사진으로 교체
 */
import facilityGuideHero from '@/assets/images/facilities/facility-guide-hero.png'
import mainSanctuaryImage from '@/assets/images/facilities/main-sanctuary.png'
import smallSanctuaryImage from '@/assets/images/facilities/small-sanctuary.png'
import forestCafeImage from '@/assets/images/facilities/forest-cafe.png'
import motherBabyRoomImage from '@/assets/images/facilities/mother-baby-room.png'

export const FACILITIES_GUIDE = {
  eyebrow: 'FACILITY GUIDE',
  title: '시설 안내',
  introLines: [
    '하늘사랑교회의 공간은 예배와 교제, 그리고 섬김을 위한 공간입니다.',
    '각 시설은 공동체가 함께 하나님을 예배하고 서로 사랑하며 성장할 수 있도록 준비되어 있습니다.',
  ],
  heroImage: facilityGuideHero,
  footerMessage: '방문하시는 모든 분들을 따뜻한 마음으로 환영합니다.',
  items: [
    {
      id: 'main-sanctuary',
      number: '01',
      title: '대예배실',
      descriptionLines: [
        '하늘사랑교회의 대표 예배 공간입니다.',
        '넓고 정돈된 예배 공간에서 성도들이 함께 모여 하나님께 예배드립니다.',
      ],
      image: mainSanctuaryImage,
    },
    {
      id: 'small-sanctuary',
      number: '02',
      title: '소예배실',
      descriptionLines: [
        '소규모 예배와 기도회, 교육 프로그램을 위한 공간입니다.',
        '따뜻한 분위기 속에서 예배와 교제가 이루어집니다.',
      ],
      image: smallSanctuaryImage,
    },
    {
      id: 'forest-cafe',
      number: '03',
      title: '더 숲 카페',
      descriptionLines: [
        '성도와 방문객이 편안하게 머물며 교제할 수 있는 공간입니다.',
      ],
      image: forestCafeImage,
    },
    {
      id: 'kitchen-dining',
      number: '04',
      title: '주방 / 식당',
      descriptionLines: [
        '공동체 식사와 교제를 위한 공간으로,',
        '함께 나누는 시간이 이어집니다.',
      ],
      image: null,
    },
    {
      id: 'mother-baby-room',
      number: '05',
      title: '자모실',
      descriptionLines: [
        '영유아와 보호자가 편안하게 머무를 수 있는 공간입니다.',
        '예배 시간 동안 아이들이 안전하게 돌봄받을 수 있도록 준비되어 있습니다.',
      ],
      image: motherBabyRoomImage,
    },
  ],
}
