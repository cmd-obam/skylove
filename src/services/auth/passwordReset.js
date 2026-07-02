import { supabase } from '@/lib/supabase'
import { AUTH_MESSAGES } from '@/constants/authMessages'
import { mapProfileUpdateAuthError } from '@/services/auth/profileUpdateErrors'
import {
  validateResetPasswordConfirm,
} from '@/services/auth/passwordValidation'

export async function resetPasswordByVerification({
  email,
  password,
  passwordConfirm,
  emailOtpVerified = false,
}) {
  const validation = validateResetPasswordConfirm(password, passwordConfirm)

  if (validation.password || validation.passwordConfirm) {
    return {
      success: false,
      errors: validation,
      message: validation.password || validation.passwordConfirm || AUTH_MESSAGES.passwordMismatch,
    }
  }

  if (!emailOtpVerified) {
    return {
      success: false,
      message: '이메일 인증을 완료해주세요.',
    }
  }

  const trimmedEmail = String(email ?? '').trim().toLowerCase()

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session?.user?.email) {
    return {
      success: false,
      message: AUTH_MESSAGES.emailVerificationFailed,
    }
  }

  if (session.user.email.toLowerCase() !== trimmedEmail) {
    return {
      success: false,
      message: AUTH_MESSAGES.emailVerificationFailed,
    }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password,
  })

  if (updateError) {
    return {
      success: false,
      message: mapProfileUpdateAuthError(updateError),
    }
  }

  await supabase.auth.signOut()

  return { success: true, message: AUTH_MESSAGES.passwordChanged }
}

export async function changePasswordLoggedIn({
  email,
  currentPassword,
  newPassword,
  newPasswordConfirm,
}) {
  if (!currentPassword) {
    return { success: false, message: '현재 비밀번호를 입력해주세요.' }
  }

  const validation = validateResetPasswordConfirm(newPassword, newPasswordConfirm)

  if (validation.password || validation.passwordConfirm) {
    return {
      success: false,
      errors: validation,
      message: validation.password || validation.passwordConfirm || AUTH_MESSAGES.passwordMismatch,
    }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: String(email ?? '').trim(),
    password: currentPassword,
  })

  if (signInError) {
    return {
      success: false,
      message: AUTH_MESSAGES.wrongCurrentPassword,
      errors: { currentPassword: AUTH_MESSAGES.wrongCurrentPassword },
    }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    return {
      success: false,
      message: mapProfileUpdateAuthError(updateError),
    }
  }

  return { success: true, message: AUTH_MESSAGES.passwordChanged }
}
