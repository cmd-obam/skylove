import { supabase } from '@/lib/supabase'
import { mapProfileFetchError } from '@/services/auth/profileErrors'

const PROFILE_SELECT = 'name, email, birth_date, phone, username, role'

export async function fetchProfileByUserId(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('user_id', userId)
    .single()

  if (error) {
    return {
      success: false,
      message: mapProfileFetchError(error),
    }
  }

  return {
    success: true,
    profile: {
      name: data.name,
      email: data.email,
      role: data.role ?? 'member',
      birthday: data.birth_date,
      phone: data.phone,
      username: data.username,
    },
  }
}

export async function fetchCurrentUserProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: '로그인 정보를 확인할 수 없습니다.',
    }
  }

  return fetchProfileByUserId(user.id)
}
