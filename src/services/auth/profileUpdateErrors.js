export function mapProfileUpdateAuthError(error) {
  const code = error?.code ?? ''
  const message = (error?.message ?? '').toLowerCase()

  if (
    code === 'same_password' ||
    message.includes('same as the old password')
  ) {
    return '현재 비밀번호와 동일한 비밀번호는 사용할 수 없습니다.'
  }

  if (
    code === 'weak_password' ||
    message.includes('password should be at least') ||
    message.includes('password is too short')
  ) {
    return '비밀번호가 너무 짧습니다.'
  }

  if (
    message.includes('invalid email') ||
    message.includes('unable to validate email') ||
    code === 'validation_failed'
  ) {
    return '잘못된 이메일 형식입니다.'
  }

  if (
    code === 'email_exists' ||
    message.includes('already registered') ||
    message.includes('already been registered')
  ) {
    return '이미 사용 중인 이메일입니다.'
  }

  if (code === 'over_email_send_rate_limit') {
    return '이메일 전송 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.'
  }

  return error?.message || '회원정보 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
}

export function mapProfileUpdateError(error) {
  const code = error?.code ?? ''
  const message = (error?.message ?? '').toLowerCase()

  if (code === '23505' || message.includes('duplicate') || message.includes('unique')) {
    return '이미 등록된 회원 정보입니다.'
  }

  if (code === '42501' || message.includes('row-level security')) {
    return '회원 정보 수정 권한이 없습니다.'
  }

  return '회원 정보 저장에 실패했습니다. 잠시 후 다시 시도해주세요.'
}
