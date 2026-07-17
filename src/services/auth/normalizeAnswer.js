/**
 * 비밀번호 찾기 보안 답변 정규화.
 * 회원가입 저장과 비밀번호 찾기 검증에서 동일하게 사용합니다.
 *
 * 규칙:
 * 1) Unicode NFC
 * 2) 줄바꿈·탭 → 공백
 * 3) 앞뒤 공백 제거
 * 4) 연속 공백을 하나로
 * 5) 모든 공백 제거 (공백 유무와 무관하게 동일 인식)
 * 6) 영문 대소문자 무시 (lowercase)
 */
export function normalizeAnswer(answer) {
  if (answer == null) {
    return ''
  }

  return String(answer)
    .normalize('NFC')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .replace(/ {2,}/g, ' ')
    .replace(/ /g, '')
    .toLowerCase()
}
