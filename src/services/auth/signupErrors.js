export const SIGNUP_SUCCESS_MESSAGE =
  '인증 메일이 발송되었습니다. 이메일 인증 후 로그인해주세요.'

export function mapSupabaseAuthError(error) {
  const code = error?.code ?? ''
  const message = (error?.message ?? '').toLowerCase()

  if (
    code === 'user_already_exists' ||
    message.includes('already registered') ||
    message.includes('already been registered')
  ) {
    return '이미 가입된 이메일입니다.'
  }

  if (
    code === 'weak_password' ||
    message.includes('password should be at least') ||
    message.includes('password is too short')
  ) {
    return '비밀번호가 너무 짧습니다.'
  }

  if (
    code === 'validation_failed' ||
    message.includes('invalid email') ||
    message.includes('unable to validate email')
  ) {
    return '잘못된 이메일 형식입니다.'
  }

  if (code === 'over_email_send_rate_limit') {
    return '이메일 전송 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.'
  }

  if (code === 'signup_disabled') {
    return '현재 회원가입이 비활성화되어 있습니다.'
  }

  return error?.message || '회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
}

export function mapSupabaseProfileError(error) {
  const code = error?.code ?? ''
  const message = (error?.message ?? '').toLowerCase()

  if (code === '23505' || message.includes('duplicate') || message.includes('unique')) {
    if (message.includes('username')) {
      return '이미 사용 중인 아이디입니다.'
    }

    return '이미 등록된 회원 정보입니다.'
  }

  if (code === '42501' || message.includes('row-level security')) {
    return '회원 정보 저장 권한이 없습니다. 관리자에게 문의해주세요.'
  }

  return '회원 정보 저장에 실패했습니다. 잠시 후 다시 시도해주세요.'
}
