/**
 * 시설안내 페이지 콘텐츠
 * images 배열의 null 항목은 추후 실제 사진으로 교체
 */

import exterior1 from '@/assets/images/facilities/exterior-1.png'
import exterior2 from '@/assets/images/facilities/exterior-2.png'
import exterior3 from '@/assets/images/facilities/exterior-3.png'
import cafe1 from '@/assets/images/facilities/cafe-1.png'
import cafe2 from '@/assets/images/facilities/cafe-2.png'
import cafe3 from '@/assets/images/facilities/cafe-3.png'
import dining1 from '@/assets/images/facilities/dining-1.png'
import dining2 from '@/assets/images/facilities/dining-2.png'
import dining3 from '@/assets/images/facilities/dining-3.png'
import smallSanctuary1 from '@/assets/images/facilities/small-sanctuary-1.png'
import smallSanctuary2 from '@/assets/images/facilities/small-sanctuary-2.png'
import smallSanctuary3 from '@/assets/images/facilities/small-sanctuary-3.png'
import mainSanctuary1 from '@/assets/images/facilities/main-sanctuary-1.png'
import mainSanctuary2 from '@/assets/images/facilities/main-sanctuary-2.png'
import mainSanctuary3 from '@/assets/images/facilities/main-sanctuary-3.png'
import motherBabyRoom1 from '@/assets/images/facilities/mother-baby-room-1.png'
import motherBabyRoom2 from '@/assets/images/facilities/mother-baby-room-2.png'
import motherBabyRoom3 from '@/assets/images/facilities/mother-baby-room-3.png'

const PLACEHOLDER_IMAGES = [null, null, null]

export const FACILITIES_GUIDE = {
  pageTitle: '교회시설안내',
  sections: [
    {
      id: 'exterior',
      title: '교회전경',
      images: [exterior1, exterior2, exterior3],
    },
    {
      id: 'floor-1',
      title: '1층',
      subsections: [
        { id: 'cafe', label: '카페', images: [cafe1, cafe2, cafe3] },
        { id: 'dining', label: '식당', images: [dining1, dining2, dining3] },
        { id: 'small-sanctuary', label: '소예배실', images: [smallSanctuary1, smallSanctuary2, smallSanctuary3] },
      ],
    },
    {
      id: 'floor-2',
      title: '2층',
      subsections: [
        { id: 'main-sanctuary', label: '대예배실', images: [mainSanctuary1, mainSanctuary2, mainSanctuary3] },
        { id: 'mother-baby-room', label: '자모실', images: [motherBabyRoom1, motherBabyRoom2, motherBabyRoom3] },
      ],
    },
    {
      id: 'floor-3',
      title: '3층',
      subsections: [
        {
          id: 'pastoral-office',
          label: '목양실',
          images: [...PLACEHOLDER_IMAGES],
          placeholderText: '이미지 준비중',
        },
        {
          id: 'praise-association',
          label: '(재)한국찬송가공회',
          images: [...PLACEHOLDER_IMAGES],
          placeholderText: '이미지 준비중',
        },
      ],
    },
  ],
}
