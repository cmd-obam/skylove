export const CONGREGANT_TYPE_OWN = 'own_church'
export const CONGREGANT_TYPE_OTHER = 'other_church'
export const CONGREGANT_TYPE_NEWCOMER = 'newcomer'

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
