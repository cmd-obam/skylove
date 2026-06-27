import { supabase } from '@/lib/supabase'
import {
  EMAIL_NOT_CONFIRMED_MESSAGE,
  mapSupabaseLoginError,
} from '@/services/auth/loginErrors'
import { fetchProfileByUserId } from '@/services/auth/profile'
import { setAuthSession } from '@/utils/auth'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function handleLogin({ email, password }) {
  const trimmedEmail = String(email ?? '').trim()

  if (!trimmedEmail) {
    return { success: false, message: '이메일을 입력해주세요.' }
  }

  if (!EMAIL_PATTERN.test(trimmedEmail)) {
    return { success: false, message: '잘못된 이메일 형식입니다.' }
  }

  if (!password) {
    return { success: false, message: '비밀번호를 입력해주세요.' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  })

  if (error) {
    return {
      success: false,
      message: mapSupabaseLoginError(error),
    }
  }

  if (data.user && !data.user.email_confirmed_at) {
    await supabase.auth.signOut()

    return {
      success: false,
      message: EMAIL_NOT_CONFIRMED_MESSAGE,
    }
  }

  const profileResult = await fetchProfileByUserId(data.user.id)

  if (!profileResult.success) {
    await supabase.auth.signOut()

    return {
      success: false,
      message: profileResult.message,
    }
  }

  setAuthSession(profileResult.profile)

  return {
    success: true,
    profile: profileResult.profile,
  }
}
