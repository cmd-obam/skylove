/**
 * signInWithOtp(/otp) 호출을 회원가입·비밀번호 찾기 등
 * 명시적 사용자 액션으로만 제한합니다.
 *
 * AuthCallback(/auth/callback, /auth/confirm)에서는
 * exchangeCodeForSession / verifyOtp 만 허용하고
 * OTP 재발송은 차단합니다.
 */

const ALLOWED_OTP_SEND_SOURCES = new Set([
  'signup-email-verify',
  'signup-email-resend',
  'password-reset-email',
])

let activeOtpSendSource = null

function getPathname() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.location.pathname.replace(/\/$/, '') || '/'
}

export function isAuthCompletionRoute(pathname = getPathname()) {
  return (
    pathname.endsWith('/auth/callback') ||
    pathname.endsWith('/auth/confirm') ||
    pathname.endsWith('/email-confirm')
  )
}

export async function withAllowedOtpSend(source, action) {
  if (!ALLOWED_OTP_SEND_SOURCES.has(source)) {
    throw new Error(`[OTP] 허용되지 않은 OTP 발송 source: ${source}`)
  }

  if (isAuthCompletionRoute()) {
    const error = new Error(
      `[OTP] 인증 완료 라우트(${getPathname()})에서는 인증 메일을 발송할 수 없습니다.`,
    )
    console.error(error)
    throw error
  }

  activeOtpSendSource = source

  try {
    return await action()
  } finally {
    activeOtpSendSource = null
  }
}

export function assertOtpSendAllowed() {
  const pathname = getPathname()

  if (isAuthCompletionRoute(pathname)) {
    const error = new Error(
      `[OTP] Blocked signInWithOtp on auth completion route: ${pathname}`,
    )
    console.error(error, { stack: error.stack, activeOtpSendSource })
    throw error
  }

  if (!activeOtpSendSource || !ALLOWED_OTP_SEND_SOURCES.has(activeOtpSendSource)) {
    const error = new Error(
      '[OTP] Blocked unexpected signInWithOtp outside an allowed signup/password-reset action',
    )
    console.error(error, {
      stack: error.stack,
      pathname,
      activeOtpSendSource,
    })
    throw error
  }

  return activeOtpSendSource
}
