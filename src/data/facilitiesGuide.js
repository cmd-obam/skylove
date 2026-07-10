/**
 * 시설안내 페이지 콘텐츠
 */

import exterior1 from '@/assets/images/facilities/exterior-1.png'
import exterior2 from '@/assets/images/facilities/exterior-2.png'
import exterior3 from '@/assets/images/facilities/exterior-3.png'
import exterior4 from '@/assets/images/facilities/exterior-4.png'
import exterior5 from '@/assets/images/facilities/exterior-5.png'
import cafe1 from '@/assets/images/facilities/cafe-1.png'
import cafe2 from '@/assets/images/facilities/cafe-2.png'
import cafe3 from '@/assets/images/facilities/cafe-3.png'
import cafe4 from '@/assets/images/facilities/cafe-4.png'
import cafe5 from '@/assets/images/facilities/cafe-5.png'
import cafe6 from '@/assets/images/facilities/cafe-6.png'
import dining1 from '@/assets/images/facilities/dining-1.png'
import dining2 from '@/assets/images/facilities/dining-2.png'
import dining3 from '@/assets/images/facilities/dining-3.png'
import smallSanctuary1 from '@/assets/images/facilities/small-sanctuary-1.png'
import smallSanctuary2 from '@/assets/images/facilities/small-sanctuary-2.png'
import smallSanctuary3 from '@/assets/images/facilities/small-sanctuary-3.png'
import mainSanctuary1 from '@/assets/images/facilities/main-sanctuary-1.png'
import mainSanctuary2 from '@/assets/images/facilities/main-sanctuary-2.png'
import mainSanctuary3 from '@/assets/images/facilities/main-sanctuary-3.png'
import mainSanctuary4 from '@/assets/images/facilities/main-sanctuary-4.png'
import mainSanctuary5 from '@/assets/images/facilities/main-sanctuary-5.png'
import motherBabyRoom1 from '@/assets/images/facilities/mother-baby-room-1.png'
import motherBabyRoom2 from '@/assets/images/facilities/mother-baby-room-2.png'
import motherBabyRoom3 from '@/assets/images/facilities/mother-baby-room-3.png'
import motherBabyRoom4 from '@/assets/images/facilities/mother-baby-room-4.png'
import motherBabyRoom5 from '@/assets/images/facilities/mother-baby-room-5.png'
import motherBabyRoom6 from '@/assets/images/facilities/mother-baby-room-6.png'

export const FACILITIES_GUIDE = {
  pageTitle: '시설안내',
  sections: [
    {
      id: 'exterior',
      title: '교회전경',
      layout: 'mosaic',
      images: [exterior1, exterior3, exterior2, exterior4, exterior5],
    },
    {
      id: 'floor-1',
      title: '1층',
      subsections: [
        {
          id: 'cafe',
          label: '카페',
          images: [cafe1, cafe2, cafe3, cafe4, cafe5, cafe6],
        },
        { id: 'dining', label: '식당', images: [dining1, dining2, dining3] },
        { id: 'small-sanctuary', label: '소예배실', images: [smallSanctuary1, smallSanctuary2, smallSanctuary3] },
      ],
    },
    {
      id: 'floor-2',
      title: '2층',
      subsections: [
        { id: 'main-sanctuary', label: '대예배실', images: [mainSanctuary1, mainSanctuary2, mainSanctuary3, mainSanctuary4, mainSanctuary5] },
        { id: 'mother-baby-room', label: '자모실', images: [motherBabyRoom1, motherBabyRoom2, motherBabyRoom3, motherBabyRoom4, motherBabyRoom5, motherBabyRoom6] },
      ],
    },
    {
      id: 'floor-3',
      title: '3층',
      subsections: [
        { id: 'pastoral-office', label: '목양실' },
        { id: 'praise-association', label: '(재)한국찬송가공회' },
      ],
    },
    {
      id: 'floor-4',
      title: '4층',
      subsections: [
        { id: 'machine-room', label: '기계실' },
        { id: 'rest-area', label: '쉼터' },
      ],
    },
  ],
}
