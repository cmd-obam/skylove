import { supabase } from '@/lib/supabase'
import { AUTH_MESSAGES } from '@/constants/authMessages'

export async function findUsernameByNameEmail({ name, email }) {
  const trimmedName = String(name ?? '').trim()
  const trimmedEmail = String(email ?? '').trim()

  if (!trimmedName) {
    return { success: false, message: '이름을 입력해주세요.' }
  }

  if (!trimmedEmail) {
    return { success: false, message: '이메일을 입력해주세요.' }
  }

  const { data, error } = await supabase.rpc('find_username_by_name_email', {
    p_name: trimmedName,
    p_email: trimmedEmail,
  })

  if (error) {
    return { success: false, message: '아이디 찾기 중 오류가 발생했습니다.' }
  }

  if (!data) {
    return { success: false, message: AUTH_MESSAGES.memberNotFound }
  }

  return {
    success: true,
    username: data,
    message: `회원님의 아이디는\n\n${data}\n\n입니다.`,
  }
}

export async function verifyMemberForPasswordReset({ name, email }) {
  const trimmedName = String(name ?? '').trim()
  const trimmedEmail = String(email ?? '').trim()

  if (!trimmedName) {
    return { success: false, message: '이름을 입력해주세요.' }
  }

  if (!trimmedEmail) {
    return { success: false, message: '이메일을 입력해주세요.' }
  }

  const { data, error } = await supabase.rpc('resolve_email_by_name_email', {
    p_name: trimmedName,
    p_email: trimmedEmail,
  })

  if (error) {
    return { success: false, message: '비밀번호 찾기 중 오류가 발생했습니다.' }
  }

  if (!data) {
    return { success: false, message: AUTH_MESSAGES.memberNotFound }
  }

  return {
    success: true,
    email: data,
    name: trimmedName,
  }
}
