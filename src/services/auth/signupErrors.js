export const SIGNUP_COMPLETE_MESSAGE = '회원가입이 완료되었습니다.'
export const SIGNUP_EMAIL_SENT_MESSAGE = '인증 메일을 발송했습니다.\n\n메일함을 확인해주세요.'
export const SIGNUP_EMAIL_VERIFIED_MESSAGE = '✅ 이메일 인증 완료'
export const SIGNUP_EMAIL_ALREADY_VERIFIED_MESSAGE = '이미 인증된 이메일입니다.'
export const SIGNUP_EMAIL_SEND_FAILED_MESSAGE = '인증 메일 발송에 실패했습니다.'
export const SIGNUP_EMAIL_RATE_LIMIT_MESSAGE = '잠시 후 다시 시도해주세요.'
export const SIGNUP_EMAIL_NOT_VERIFIED_MESSAGE = '이메일 인증을 완료해주세요.'
export const SIGNUP_RESEND_SUCCESS_MESSAGE =
  '인증 메일을 다시 발송했습니다. 메일함을 확인해주세요.'

export function getSignupSuccessMessage(data) {
  const needsEmailConfirmation =
    Boolean(data?.user) && !data.session && !data.user.email_confirmed_at

  if (needsEmailConfirmation) {
    return SIGNUP_EMAIL_SENT_MESSAGE
  }

  return SIGNUP_COMPLETE_MESSAGE
}

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

  if (code === 'otp_disabled') {
    return '이메일 OTP 인증이 비활성화되어 있습니다. Supabase Auth 설정을 확인해주세요.'
  }

  if (message.includes('redirect') || message.includes('redirect_to')) {
    return 'Redirect URL이 허용되지 않습니다. Supabase Auth → URL Configuration을 확인해주세요.'
  }

  return error?.message || '회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
}

export function mapEmailVerificationError(error) {
  const code = error?.code ?? ''
  const message = (error?.message ?? '').toLowerCase()

  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
    return SIGNUP_EMAIL_RATE_LIMIT_MESSAGE
  }

  if (
    code === 'otp_disabled' ||
    message.includes('redirect') ||
    message.includes('redirect_to')
  ) {
    return mapSupabaseAuthError(error)
  }

  return SIGNUP_EMAIL_SEND_FAILED_MESSAGE
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

  if (message.includes('username already taken')) {
    return '이미 사용 중인 아이디입니다.'
  }

  if (message.includes('profile already exists')) {
    return '이미 회원가입이 완료된 계정입니다.'
  }

  if (message.includes('user not found or email mismatch')) {
    return '인증 계정과 이메일이 일치하지 않습니다. 이메일을 확인해주세요.'
  }

  if (code === '42501' || message.includes('row-level security') || message.includes('permission denied')) {
    return error?.message || '회원 정보 저장 권한이 없습니다. 관리자에게 문의해주세요.'
  }

  const parts = [error?.message, error?.details, error?.hint].filter(Boolean)

  return parts.join(' ') || '회원 정보 저장에 실패했습니다. 잠시 후 다시 시도해주세요.'
}

export function formatSupabaseError(error) {
  if (!error) {
    return null
  }

  return {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  }
}

export function classifyProfileSaveError(error, stage = 'unknown') {
  const code = error?.code ?? ''
  const message = (error?.message ?? '').toLowerCase()

  if (code === 'PGRST202') {
    return { kind: 'rpc_not_found', label: 'RPC 함수 없음 (PostgREST 스키마 캐시)' }
  }

  if (code === '42883' && message.includes('does not exist')) {
    return { kind: 'rpc_not_found', label: 'RPC 함수 없음 (PostgreSQL)' }
  }

  if (code === 'PGRST205' || (message.includes('profiles') && message.includes('does not exist'))) {
    return { kind: 'table_not_found', label: 'profiles 테이블 없음' }
  }

  if (code === '42501' || message.includes('permission denied') || message.includes('row-level security')) {
    if (stage === 'direct_insert') {
      return { kind: 'rls_expected', label: 'direct insert RLS 차단 (RPC fallback 예상)' }
    }

    return { kind: 'permission', label: '권한(RLS/GRANT) 문제' }
  }

  if (code === '23505' || message.includes('duplicate') || message.includes('unique')) {
    return { kind: 'duplicate', label: '중복 데이터' }
  }

  if (message.includes('user not found or email mismatch')) {
    return { kind: 'auth_user_mismatch', label: 'auth.users와 이메일 불일치' }
  }

  if (message.includes('username already taken')) {
    return { kind: 'username_taken', label: '아이디 중복' }
  }

  if (message.includes('profile already exists')) {
    return { kind: 'profile_exists', label: '프로필 이미 존재' }
  }

  return { kind: 'unknown', label: '기타 오류' }
}
