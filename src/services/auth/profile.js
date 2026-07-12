import { supabase } from '@/lib/supabase'
import {
  describeProfileFetchRequest,
  logSupabaseError,
  serializeSupabaseError,
} from '@/lib/supabaseErrorLog'
import { mapProfileFetchError } from '@/services/auth/profileErrors'
import { DEFAULT_MEMBER_ROLE, PROFILE_SELECT } from '@/services/auth/profileSchema'
import { normalizeRole } from '@/services/auth/roles'
import { logFetchProfileRoleDebug } from '@/utils/authRoleDebug'

export { PROFILE_SELECT } from '@/services/auth/profileSchema'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''

export async function fetchProfileByUserId(userId) {
  const request = describeProfileFetchRequest(supabaseUrl, userId, PROFILE_SELECT)

  console.log('[Profile] fetchProfileByUserId request', request)

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('user_id', userId)
    .single()

  if (error) {
    logSupabaseError('Profile', error, {
      operation: 'fetchProfileByUserId',
      request,
    })

    const response = serializeSupabaseError(error)

    return {
      success: false,
      message: mapProfileFetchError(error),
      error,
      response,
      request,
    }
  }

  console.log('[Profile] fetchProfileByUserId success', { userId, data })

  const profile = {
    name: data.name,
    email: data.email,
    role: normalizeRole(data.role) ?? DEFAULT_MEMBER_ROLE,
    birthday: data.birth_date,
    phone: data.phone,
    username: data.username,
  }

  logFetchProfileRoleDebug({ userId, data, mappedProfile: profile })

  return {
    success: true,
    profile,
  }
}

export async function fetchCurrentUserProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    logSupabaseError('Profile', userError, { operation: 'fetchCurrentUserProfile.getUser' })

    return {
      success: false,
      message: '로그인 정보를 확인할 수 없습니다.',
      error: userError,
      response: serializeSupabaseError(userError),
    }
  }

  return fetchProfileByUserId(user.id)
}
