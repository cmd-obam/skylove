import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CONGREGANT_TYPE_NEWCOMER,
  CONGREGANT_TYPE_OTHER,
  CONGREGANT_TYPE_OWN,
  OWN_CHURCH_NAME,
  normalizeChurchInformation,
} from '../src/data/congregantTypes.js'

test('교인구분 미선택은 저장할 수 없다', () => {
  const result = normalizeChurchInformation('', '')
  assert.equal(result.valid, false)
})

test('본 교회 교인은 교회명을 자동 저장하고 새가족이 아니다', () => {
  const result = normalizeChurchInformation(CONGREGANT_TYPE_OWN, '무시할 값')
  assert.deepEqual(result, {
    valid: true,
    congregantType: CONGREGANT_TYPE_OWN,
    attendingChurch: OWN_CHURCH_NAME,
    isNewcomer: false,
    message: '',
  })
})

test('타 교회 교인은 출석교회가 필수다', () => {
  const missing = normalizeChurchInformation(CONGREGANT_TYPE_OTHER, '   ')
  assert.equal(missing.valid, false)

  const saved = normalizeChurchInformation(CONGREGANT_TYPE_OTHER, ' 사랑의교회 ')
  assert.equal(saved.valid, true)
  assert.equal(saved.attendingChurch, '사랑의교회')
  assert.equal(saved.isNewcomer, false)
})

test('새신자는 출석교회를 저장하지 않고 새가족이다', () => {
  const result = normalizeChurchInformation(CONGREGANT_TYPE_NEWCOMER, '무시할 값')
  assert.equal(result.valid, true)
  assert.equal(result.attendingChurch, null)
  assert.equal(result.isNewcomer, true)
})
