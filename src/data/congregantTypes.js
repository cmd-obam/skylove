export const CONGREGANT_TYPE_OWN = 'own_church'
export const CONGREGANT_TYPE_OTHER = 'other_church'
export const CONGREGANT_TYPE_NEWCOMER = 'newcomer'
export const OWN_CHURCH_NAME = '하늘사랑교회'

export const CONGREGANT_TYPES = [
  { id: CONGREGANT_TYPE_OWN, label: '본 교회 교인' },
  { id: CONGREGANT_TYPE_OTHER, label: '타 교회 교인' },
  { id: CONGREGANT_TYPE_NEWCOMER, label: '새신자' },
]

export const CONGREGANT_TYPE_IDS = new Set(CONGREGANT_TYPES.map((item) => item.id))

export const ATTENDING_CHURCH_PLACEHOLDER = '예) 하늘교회, 사랑교회'

export function isOtherCongregantType(value) {
  return value === CONGREGANT_TYPE_OTHER
}

export function getCongregantTypeLabel(value) {
  const match = CONGREGANT_TYPES.find((item) => item.id === value)
  return match?.label ?? ''
}

export function isNewcomerCongregantType(value) {
  return value === CONGREGANT_TYPE_NEWCOMER
}

export function getNewcomerStatus(value) {
  if (!CONGREGANT_TYPE_IDS.has(value)) {
    return null
  }

  return isNewcomerCongregantType(value)
}

export function normalizeChurchInformation(congregantType, attendingChurch = '') {
  const normalizedType = String(congregantType ?? '').trim()
  const normalizedChurch = String(attendingChurch ?? '').trim()

  if (!CONGREGANT_TYPE_IDS.has(normalizedType)) {
    return {
      valid: false,
      congregantType: null,
      attendingChurch: null,
      isNewcomer: null,
      message: '교인 구분을 선택해주세요.',
    }
  }

  if (isOtherCongregantType(normalizedType) && !normalizedChurch) {
    return {
      valid: false,
      congregantType: normalizedType,
      attendingChurch: null,
      isNewcomer: false,
      message: '타 교회 교인은 출석 교회를 입력해야 합니다.',
    }
  }

  return {
    valid: true,
    congregantType: normalizedType,
    attendingChurch: isOtherCongregantType(normalizedType) ? normalizedChurch : null,
    isNewcomer: isNewcomerCongregantType(normalizedType),
    message: '',
  }
}
