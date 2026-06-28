export const EMAIL_NOT_CONFIRMED_MESSAGE = '이메일 인증 후 로그인해주세요.'
export const USERNAME_NOT_FOUND_MESSAGE = '존재하지 않는 아이디입니다.'
export const WRONG_PASSWORD_MESSAGE = '비밀번호가 올바르지 않습니다.'
export const DB_QUERY_FAILED_MESSAGE =
  '로그인 정보 조회에 실패했습니다. 잠시 후 다시 시도해주세요.'

export function mapSupabaseLoginError(error, { usernameResolved = false } = {}) {
  const code = error?.code ?? ''
  const message = (error?.message ?? '').toLowerCase()

  if (
    code === 'email_not_confirmed' ||
    message.includes('email not confirmed') ||
    message.includes('email not verified')
  ) {
    return EMAIL_NOT_CONFIRMED_MESSAGE
  }

  if (
    code === 'invalid_credentials' ||
    message.includes('invalid login credentials') ||
    message.includes('invalid email or password')
  ) {
    if (usernameResolved) {
      return WRONG_PASSWORD_MESSAGE
    }

    return '이메일 또는 비밀번호가 올바르지 않습니다.'
  }

  if (message.includes('invalid email') || code === 'validation_failed') {
    return '잘못된 이메일 형식입니다.'
  }

  if (code === 'over_request_rate_limit') {
    return '로그인 시도 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.'
  }

  return error?.message || '로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
}
