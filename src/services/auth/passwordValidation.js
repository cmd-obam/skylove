const LETTER_PATTERN = /[a-zA-Z]/
const DIGIT_PATTERN = /\d/

export const RESET_PASSWORD_HINT = '8자 이상, 영문·숫자 포함'
export const RESET_PASSWORD_PLACEHOLDER = '8자 이상, 영문·숫자 포함하여 입력하세요.'

export function validateResetPassword(password) {
  if (!password) {
    return '비밀번호를 입력해주세요.'
  }

  if (password.length < 8) {
    return '비밀번호는 8자 이상 입력해주세요.'
  }

  if (!LETTER_PATTERN.test(password)) {
    return '비밀번호에 영문을 포함해주세요.'
  }

  if (!DIGIT_PATTERN.test(password)) {
    return '비밀번호에 숫자를 포함해주세요.'
  }

  return null
}

export function validateResetPasswordConfirm(password, passwordConfirm) {
  const passwordError = validateResetPassword(password)

  if (passwordError) {
    return { password: passwordError, passwordConfirm: null }
  }

  if (!passwordConfirm) {
    return { password: null, passwordConfirm: '비밀번호 확인을 입력해주세요.' }
  }

  if (password !== passwordConfirm) {
    return { password: null, passwordConfirm: '❌ 비밀번호가 일치하지 않습니다.' }
  }

  return { password: null, passwordConfirm: null }
}
