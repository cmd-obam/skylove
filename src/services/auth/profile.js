import { supabase } from '@/lib/supabase'
import { mapProfileFetchError } from '@/services/auth/profileErrors'

const PROFILE_SELECT = 'name, email, role, birthday, phone'

export async function fetchProfileByUserId(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
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
      role: data.role,
      birthday: data.birthday,
      phone: data.phone,
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
