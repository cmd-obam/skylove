export const SECURITY_QUESTIONS = [
  { id: 'favorite-character', label: '내가 좋아하는 캐릭터는?' },
  { id: 'body-secret', label: '타인이 모르는 자신만의 신체비밀이 있다면?' },
  { id: 'life-motto', label: '자신의 인생 좌우명은?' },
  { id: 'elementary-partner', label: '초등학교 때 기억에 남는 짝꿍 이름은?' },
  { id: 'childhood-friend', label: '유년시절 가장 생각나는 친구 이름은?' },
  { id: 'memorable-teacher', label: '가장 기억에 남는 선생님 성함은?' },
  { id: 'childhood-nickname', label: '친구들에게 공개하지 않은 어릴 적 별명이 있다면?' },
  { id: 'reborn-as', label: '다시 태어나면 되고 싶은 것은?' },
  { id: 'impressive-movie', label: '가장 감명깊게 본 영화는?' },
  { id: 'book-quote', label: '읽은 책 중에서 좋아하는 구절이 있다면?' },
  { id: 'memorable-place', label: '기억에 남는 추억의 장소는?' },
  { id: 'impressive-book', label: '인상 깊게 읽은 책 이름은?' },
  { id: 'treasure-no1', label: '자신의 보물 제1호는?' },
  { id: 'unique-gift', label: '받았던 선물 중 기억에 남는 독특한 선물은?' },
  { id: 'second-respect', label: '자신이 두번째로 존경하는 인물은?' },
  { id: 'father-name', label: '아버지의 성함은?' },
  { id: 'mother-name', label: '어머니의 성함은?' },
]

export const SECURITY_QUESTION_PLACEHOLDER = '---------- 선택하세요. ----------'

export function getSecurityQuestionLabel(questionId) {
  return SECURITY_QUESTIONS.find((item) => item.id === questionId)?.label ?? ''
}
