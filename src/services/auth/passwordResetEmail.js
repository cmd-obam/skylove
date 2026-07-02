import { supabase } from '@/lib/supabase'
import { mapEmailVerificationError } from '@/services/auth/signupErrors'

export const PASSWORD_RESET_EMAIL_SENT_MESSAGE =
  '인증번호가 발송되었습니다.\n\n이메일을 확인해주세요.'
export const PASSWORD_RESET_EMAIL_RESEND_MESSAGE =
  '인증번호를 다시 발송했습니다.\n\n이메일을 확인해주세요.'

export async function sendPasswordResetEmailOtp(email) {
  const trimmedEmail = String(email ?? '').trim().toLowerCase()

  if (!trimmedEmail) {
    return { success: false, message: '이메일을 입력해주세요.' }
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmedEmail,
    options: {
      shouldCreateUser: false,
    },
  })

  if (error) {
    return {
      success: false,
      message: mapEmailVerificationError(error),
    }
  }

  return {
    success: true,
    message: PASSWORD_RESET_EMAIL_SENT_MESSAGE,
  }
}

export async function verifyPasswordResetEmailOtp({ email, token }) {
  const trimmedEmail = String(email ?? '').trim().toLowerCase()
  const trimmedToken = String(token ?? '').trim()

  if (!trimmedEmail) {
    return { success: false, message: '이메일을 입력해주세요.' }
  }

  if (!trimmedToken) {
    return { success: false, message: '인증번호를 입력해주세요.' }
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: trimmedEmail,
    token: trimmedToken,
    type: 'email',
  })

  if (error) {
    return {
      success: false,
      message: '이메일 인증에 실패했습니다.',
    }
  }

  if (!data?.user?.email || data.user.email.toLowerCase() !== trimmedEmail) {
    return {
      success: false,
      message: '이메일 인증에 실패했습니다.',
    }
  }

  return { success: true }
}
