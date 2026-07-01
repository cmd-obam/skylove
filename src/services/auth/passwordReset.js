import { supabase } from '@/lib/supabase'
import { AUTH_MESSAGES } from '@/constants/authMessages'
import { mapProfileUpdateAuthError } from '@/services/auth/profileUpdateErrors'
import {
  validateResetPassword,
  validateResetPasswordConfirm,
} from '@/services/auth/passwordValidation'

export async function resetPasswordByVerification({ name, email, password, passwordConfirm }) {
  const validation = validateResetPasswordConfirm(password, passwordConfirm)

  if (validation.password || validation.passwordConfirm) {
    return {
      success: false,
      errors: validation,
      message: validation.password || validation.passwordConfirm,
    }
  }

  const { data, error } = await supabase.functions.invoke('reset-password', {
    method: 'POST',
    body: {
      name: String(name ?? '').trim(),
      email: String(email ?? '').trim(),
      password,
    },
  })

  if (error) {
    return {
      success: false,
      message:
        '비밀번호 변경 서버 호출에 실패했습니다. Supabase Edge Function(reset-password) 배포를 확인해주세요.',
    }
  }

  if (data?.error === 'not_found') {
    return { success: false, message: AUTH_MESSAGES.memberNotFound }
  }

  if (data?.error) {
    return {
      success: false,
      message: data.message || '비밀번호 변경에 실패했습니다.',
    }
  }

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
      message: validation.password || validation.passwordConfirm,
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
