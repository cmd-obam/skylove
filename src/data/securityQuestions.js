export const SECURITY_CUSTOM_QUESTION_ID = 'custom'

export const SECURITY_QUESTIONS = [
  { id: 'mother-full-name', label: '어머니 성함은 무엇인가요?' },
  { id: 'father-full-name', label: '아버지 성함은 무엇인가요?' },
  { id: 'birth-city', label: '태어난 도시는 어디인가요?' },
  { id: 'elementary-school', label: '졸업한 초등학교는 어디인가요?' },
  { id: 'first-attended-church', label: '첫 출석한 교회는 어디인가요?' },
  { id: 'baptism-church', label: '세례를 받은 교회는 어디인가요?' },
  { id: 'first-senior-pastor', label: '첫 담임목사님의 성함은 무엇인가요?' },
  { id: 'first-workplace', label: '첫 직장 이름은 무엇인가요?' },
  { id: SECURITY_CUSTOM_QUESTION_ID, label: '직접 입력' },
]

/** 이전 버전 회원가입 질문 ID (표시용) */
const LEGACY_SECURITY_QUESTIONS = [
  { id: 'memorable-bible-verse', label: '가장 기억에 남는 성경 구절은 무엇인가요?' },
  { id: 'favorite-hymn', label: '가장 좋아하는 찬양은 무엇인가요?' },
  { id: 'respected-bible-figure', label: '가장 존경하는 성경 인물은 누구인가요?' },
  { id: 'childhood-nickname', label: '어릴 적 가장 기억에 남는 별명은 무엇인가요?' },
  { id: 'favorite-food', label: '가장 좋아하는 음식은 무엇인가요?' },
  { id: 'first-church', label: '처음 출석한 교회는 어디인가요?' },
  { id: 'favorite-character', label: '내가 좋아하는 캐릭터는?' },
  { id: 'body-secret', label: '타인이 모르는 자신만의 신체비밀이 있다면?' },
  { id: 'life-motto', label: '자신의 인생 좌우명은?' },
  { id: 'elementary-partner', label: '초등학교 때 기억에 남는 짝꿍 이름은?' },
  { id: 'childhood-friend', label: '유년시절 가장 생각나는 친구 이름은?' },
  { id: 'memorable-teacher', label: '가장 기억에 남는 선생님 성함은?' },
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

export const SECURITY_QUESTION_PLACEHOLDER = '-------- 선택하세요 --------'

export function getSecurityQuestionLabel(storedValue) {
  if (!storedValue) {
    return ''
  }

  const allQuestions = [...SECURITY_QUESTIONS, ...LEGACY_SECURITY_QUESTIONS]
  const found = allQuestions.find((item) => item.id === storedValue)

  return found?.label ?? storedValue
}

export function resolveSecurityQuestionForStorage(form) {
  if (form.securityQuestion === SECURITY_CUSTOM_QUESTION_ID) {
    return form.securityCustomQuestion.trim()
  }

  return form.securityQuestion
}

export function isCustomSecurityQuestionSelected(questionId) {
  return questionId === SECURITY_CUSTOM_QUESTION_ID
}
